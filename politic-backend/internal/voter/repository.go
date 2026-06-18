package voter

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Create(ctx context.Context, campaignID string, v *VoterInputMapped) error
	GetByCampaign(ctx context.Context, campaignID string) ([]Voter, error)
	Update(ctx context.Context, id string, campaignID string, v *VoterInputMapped) error
	Delete(ctx context.Context, id string, campaignID string) error
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

const (
	queryCreateVoter = `
		INSERT INTO voters (full_name, dni, address, phone, email, location, campaign_id, tags)
		VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9)
		RETURNING id, created_at, updated_at`

	queryGetByCampaign = `
		SELECT id, full_name, dni, address, phone, email,
		       ST_X(location) as longitude, ST_Y(location) as latitude,
		       campaign_id, tags, created_at, updated_at
		FROM voters
		WHERE campaign_id = $1
		ORDER BY created_at DESC`
)

func (r *repository) Create(ctx context.Context, campaignID string, v *VoterInputMapped) error {
	return r.pool.QueryRow(ctx, queryCreateVoter,
		v.FullName, v.Dni, v.Address, v.Phone, v.Email,
		v.Longitude, v.Latitude, campaignID, v.Tags,
	).Scan(&v.ID, &v.CreatedAt, &v.UpdatedAt)
}

func (r *repository) GetByCampaign(ctx context.Context, campaignID string) ([]Voter, error) {
	rows, err := r.pool.Query(ctx, queryGetByCampaign, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var voters []Voter
	for rows.Next() {
		var v Voter
		if err := rows.Scan(
			&v.ID, &v.FullName, &v.Dni, &v.Address, &v.Phone, &v.Email,
			&v.Longitude, &v.Latitude, &v.CampaignID, &v.Tags, &v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			return nil, err
		}
		voters = append(voters, v)
	}

	return voters, rows.Err()
}

const (
	queryUpdateVoter = `
		UPDATE voters
		SET full_name = $1, dni = $2, address = $3, phone = $4, email = $5,
		    location = ST_SetSRID(ST_MakePoint($6, $7), 4326), tags = $8, updated_at = NOW()
		WHERE id = $9 AND campaign_id = $10`

	queryDeleteVoter = `DELETE FROM voters WHERE id = $1 AND campaign_id = $2`
)

func (r *repository) Update(ctx context.Context, id string, campaignID string, v *VoterInputMapped) error {
	_, err := r.pool.Exec(ctx, queryUpdateVoter,
		v.FullName, v.Dni, v.Address, v.Phone, v.Email,
		v.Longitude, v.Latitude, v.Tags,
		id, campaignID,
	)
	return err
}

func (r *repository) Delete(ctx context.Context, id string, campaignID string) error {
	_, err := r.pool.Exec(ctx, queryDeleteVoter, id, campaignID)
	return err
}
