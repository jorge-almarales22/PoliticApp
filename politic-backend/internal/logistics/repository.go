package logistics

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInsufficientStock = errors.New("stock insuficiente para completar el despacho")
	ErrInventoryNotFound = errors.New("ítem de inventario no encontrado")
)

type Repository interface {
	CreateVehicle(ctx context.Context, campaignID string, v *Vehicle) error
	GetVehicles(ctx context.Context, campaignID string) ([]Vehicle, error)
	CreateInventory(ctx context.Context, campaignID string, i *InventoryItem) error
	CreateDispatch(ctx context.Context, campaignID string, d *Dispatch) error
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

const (
	queryCreateVehicle = `
		INSERT INTO vehicles (campaign_id, plate, model, driver_name, driver_phone)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, status, created_at`

	queryGetVehicles = `
		SELECT id, campaign_id, plate, model, driver_name, driver_phone, status, created_at
		FROM vehicles
		WHERE campaign_id = $1
		ORDER BY created_at DESC`

	queryCreateInventory = `
		INSERT INTO logistics_inventory (campaign_id, item_name, item_type, total_qty)
		VALUES ($1, $2, $3, $4)
		RETURNING id, allocated_qty, created_at`

	queryCheckInventory = `
		SELECT total_qty - allocated_qty
		FROM logistics_inventory
		WHERE id = $1 AND campaign_id = $2
		FOR UPDATE`

	queryInsertDispatch = `
		INSERT INTO logistics_dispatches (campaign_id, inventory_id, receiver_id, quantity, qr_code_token)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, status, created_at`

	queryUpdateInventory = `
		UPDATE logistics_inventory
		SET allocated_qty = allocated_qty + $1
		WHERE id = $2 AND campaign_id = $3`
)

func (r *repository) CreateVehicle(ctx context.Context, campaignID string, v *Vehicle) error {
	return r.pool.QueryRow(ctx, queryCreateVehicle,
		campaignID, v.Plate, v.Model, v.DriverName, v.DriverPhone,
	).Scan(&v.ID, &v.Status, &v.CreatedAt)
}

func (r *repository) GetVehicles(ctx context.Context, campaignID string) ([]Vehicle, error) {
	rows, err := r.pool.Query(ctx, queryGetVehicles, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vehicles []Vehicle
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(
			&v.ID, &v.CampaignID, &v.Plate, &v.Model, &v.DriverName,
			&v.DriverPhone, &v.Status, &v.CreatedAt,
		); err != nil {
			return nil, err
		}
		vehicles = append(vehicles, v)
	}

	return vehicles, rows.Err()
}

func (r *repository) CreateInventory(ctx context.Context, campaignID string, i *InventoryItem) error {
	return r.pool.QueryRow(ctx, queryCreateInventory,
		campaignID, i.ItemName, i.ItemType, i.TotalQty,
	).Scan(&i.ID, &i.AllocatedQty, &i.CreatedAt)
}

func (r *repository) CreateDispatch(ctx context.Context, campaignID string, d *Dispatch) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var available int
	err = tx.QueryRow(ctx, queryCheckInventory, d.InventoryID, campaignID).Scan(&available)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrInventoryNotFound
		}
		return err
	}

	if available < d.Quantity {
		return ErrInsufficientStock
	}

	d.QRCodeToken = uuid.New().String()

	err = tx.QueryRow(ctx, queryInsertDispatch,
		campaignID, d.InventoryID, d.ReceiverID, d.Quantity, d.QRCodeToken,
	).Scan(&d.ID, &d.Status, &d.CreatedAt)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, queryUpdateInventory, d.Quantity, d.InventoryID, campaignID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
