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
	ErrInventoryNotFound = errors.New("item de inventario no encontrado")
)

type Repository interface {
	CreateDriver(ctx context.Context, d *Driver) error
	GetDrivers(ctx context.Context) ([]Driver, error)

	CreateVehicle(ctx context.Context, campaignID string, v *Vehicle) error
	GetVehicles(ctx context.Context, campaignID string) ([]Vehicle, error)
	UpdateVehicleStatus(ctx context.Context, id string, campaignID string, status string) error

	CreateInventory(ctx context.Context, campaignID string, i *InventoryItem) error
	GetInventory(ctx context.Context, campaignID string) ([]InventoryItem, error)

	CreateDispatch(ctx context.Context, campaignID string, d *Dispatch) error
	GetDispatches(ctx context.Context, campaignID string) ([]DispatchDetail, error)
	GetDispatchByID(ctx context.Context, id string) (*DispatchDetail, error)
	ReceiveDispatch(ctx context.Context, id string) error
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

const (
	queryCreateDriver = `
		INSERT INTO drivers (full_name, dni, address, blood_type, license_pdf_url)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`

	queryGetDrivers = `
		SELECT id, full_name, dni, address, blood_type, license_pdf_url, created_at
		FROM drivers ORDER BY full_name ASC`

	queryCreateVehicle = `
		INSERT INTO vehicles (campaign_id, plate, model, driver_id, driver_name, driver_phone, image_url, soat_pdf_url, tecnomecanica_pdf_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, status, created_at`

	queryGetVehicles = `
		SELECT v.id, v.campaign_id, v.plate, v.model, v.driver_id, v.driver_name, v.driver_phone,
		       v.status, v.image_url, v.soat_pdf_url, v.tecnomecanica_pdf_url, v.created_at
		FROM vehicles v
		WHERE v.campaign_id = $1
		ORDER BY v.created_at DESC`

	queryUpdateVehicleStatus = `UPDATE vehicles SET status = $1 WHERE id = $2 AND campaign_id = $3`

	queryCreateInventory = `
		INSERT INTO logistics_inventory (campaign_id, item_name, item_type, total_qty, image_url)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, allocated_qty, created_at`

	queryGetInventory = `
		SELECT id, campaign_id, item_name, item_type, total_qty, allocated_qty, image_url, created_at
		FROM logistics_inventory
		WHERE campaign_id = $1
		ORDER BY created_at DESC`

	queryCheckInventory = `
		SELECT total_qty - allocated_qty
		FROM logistics_inventory
		WHERE id = $1 AND campaign_id = $2
		FOR UPDATE`

	queryInsertDispatch = `
		INSERT INTO logistics_dispatches (campaign_id, inventory_id, receiver_id, vehicle_id, quantity, qr_code_token, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'EN_CAMINO')
		RETURNING id, status, created_at`

	queryUpdateInventory = `
		UPDATE logistics_inventory
		SET allocated_qty = allocated_qty + $1
		WHERE id = $2 AND campaign_id = $3`

	queryGetDispatches = `
		SELECT d.id, d.campaign_id, d.inventory_id, COALESCE(li.item_name, ''),
		       d.quantity,
		       d.receiver_id, COALESCE(u.full_name, ''),
		       COALESCE(v.plate, ''), COALESCE(v.driver_name, ''),
		       d.qr_code_token, d.status, d.created_at
		FROM logistics_dispatches d
		LEFT JOIN logistics_inventory li ON li.id = d.inventory_id
		LEFT JOIN users u ON u.id = d.receiver_id
		LEFT JOIN vehicles v ON v.id = d.vehicle_id
		WHERE d.campaign_id = $1
		ORDER BY d.created_at DESC`

	queryReceiveDispatch = `
		UPDATE logistics_dispatches SET status = 'ENTREGADO'
		WHERE id = $1 AND status = 'EN_CAMINO'`

	queryGetDispatchByID = `
		SELECT d.id, d.campaign_id, d.inventory_id, COALESCE(li.item_name, ''), d.quantity,
		       d.receiver_id, COALESCE(u.full_name, ''),
		       COALESCE(v.plate, ''), COALESCE(v.driver_name, ''),
		       d.qr_code_token, d.status, d.created_at
		FROM logistics_dispatches d
		LEFT JOIN logistics_inventory li ON li.id = d.inventory_id
		LEFT JOIN users u ON u.id = d.receiver_id
		LEFT JOIN vehicles v ON v.id = d.vehicle_id
		WHERE d.id = $1`
)

func (r *repository) CreateDriver(ctx context.Context, d *Driver) error {
	return r.pool.QueryRow(ctx, queryCreateDriver,
		d.FullName, d.Dni, d.Address, d.BloodType, d.LicensePDFURL,
	).Scan(&d.ID, &d.CreatedAt)
}

func (r *repository) GetDrivers(ctx context.Context) ([]Driver, error) {
	rows, err := r.pool.Query(ctx, queryGetDrivers)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []Driver
	for rows.Next() {
		var d Driver
		var address, bloodType, licenseURL *string
		if err := rows.Scan(&d.ID, &d.FullName, &d.Dni, &address, &bloodType, &licenseURL, &d.CreatedAt); err != nil {
			return nil, err
		}
		if address != nil { d.Address = *address }
		if bloodType != nil { d.BloodType = *bloodType }
		if licenseURL != nil { d.LicensePDFURL = *licenseURL }
		drivers = append(drivers, d)
	}
	return drivers, rows.Err()
}

func (r *repository) CreateVehicle(ctx context.Context, campaignID string, v *Vehicle) error {
	return r.pool.QueryRow(ctx, queryCreateVehicle,
		campaignID, v.Plate, v.Model, v.DriverID, v.DriverName, v.DriverPhone,
		v.ImageURL, v.SoatPDFURL, v.TecnomecanicaPDFURL,
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
		var driverID, driverName, driverPhone, imageURL, soatURL, tecnoURL *string
		if err := rows.Scan(
			&v.ID, &v.CampaignID, &v.Plate, &v.Model, &driverID, &driverName,
			&driverPhone, &v.Status, &imageURL, &soatURL, &tecnoURL, &v.CreatedAt,
		); err != nil {
			return nil, err
		}
		if driverID != nil { v.DriverID = *driverID }
		if driverName != nil { v.DriverName = *driverName }
		if driverPhone != nil { v.DriverPhone = *driverPhone }
		if imageURL != nil { v.ImageURL = *imageURL }
		if soatURL != nil { v.SoatPDFURL = *soatURL }
		if tecnoURL != nil { v.TecnomecanicaPDFURL = *tecnoURL }
		vehicles = append(vehicles, v)
	}
	return vehicles, rows.Err()
}

func (r *repository) UpdateVehicleStatus(ctx context.Context, id string, campaignID string, status string) error {
	_, err := r.pool.Exec(ctx, queryUpdateVehicleStatus, status, id, campaignID)
	return err
}

func (r *repository) CreateInventory(ctx context.Context, campaignID string, i *InventoryItem) error {
	return r.pool.QueryRow(ctx, queryCreateInventory,
		campaignID, i.ItemName, i.ItemType, i.TotalQty, i.ImageURL,
	).Scan(&i.ID, &i.AllocatedQty, &i.CreatedAt)
}

func (r *repository) GetInventory(ctx context.Context, campaignID string) ([]InventoryItem, error) {
	rows, err := r.pool.Query(ctx, queryGetInventory, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []InventoryItem
	for rows.Next() {
		var i InventoryItem
		var imageURL *string
		if err := rows.Scan(&i.ID, &i.CampaignID, &i.ItemName, &i.ItemType, &i.TotalQty, &i.AllocatedQty, &imageURL, &i.CreatedAt); err != nil {
			return nil, err
		}
		if imageURL != nil {
			i.ImageURL = *imageURL
		}
		items = append(items, i)
	}
	return items, rows.Err()
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
		campaignID, d.InventoryID, d.ReceiverID, d.VehicleID, d.Quantity, d.QRCodeToken,
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

func (r *repository) GetDispatches(ctx context.Context, campaignID string) ([]DispatchDetail, error) {
	rows, err := r.pool.Query(ctx, queryGetDispatches, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []DispatchDetail
	for rows.Next() {
		var d DispatchDetail
		if err := rows.Scan(&d.ID, &d.CampaignID, &d.InventoryID, &d.ItemName, &d.Quantity,
			&d.ReceiverID, &d.ReceiverName, &d.VehiclePlate, &d.DriverName,
			&d.QRCodeToken, &d.Status, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

func (r *repository) GetDispatchByID(ctx context.Context, id string) (*DispatchDetail, error) {
	var d DispatchDetail
	if err := r.pool.QueryRow(ctx, queryGetDispatchByID, id).Scan(
		&d.ID, &d.CampaignID, &d.InventoryID, &d.ItemName, &d.Quantity,
		&d.ReceiverID, &d.ReceiverName, &d.VehiclePlate, &d.DriverName,
		&d.QRCodeToken, &d.Status, &d.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *repository) ReceiveDispatch(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, queryReceiveDispatch, id)
	return err
}
