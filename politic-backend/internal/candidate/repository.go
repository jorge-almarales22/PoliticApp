package candidate

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Create(ctx context.Context, campaignID string, c *Candidate) error
	GetByCampaign(ctx context.Context, campaignID string) ([]Candidate, error)
	GetByID(ctx context.Context, id string, campaignID string) (*Candidate, error)
	Update(ctx context.Context, id string, campaignID string, c *Candidate) error
	Delete(ctx context.Context, id string, campaignID string) error
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

const (
	queryCreateCandidate = `
		INSERT INTO candidates (campaign_id, full_name, email, phone, photo_url, is_main)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	queryGetByCampaign = `
		SELECT id, campaign_id, full_name, email, phone, photo_url, is_main, created_at, updated_at
		FROM candidates
		WHERE campaign_id = $1
		ORDER BY is_main DESC, full_name ASC`

	queryGetByID = `
		SELECT id, campaign_id, full_name, email, phone, photo_url, is_main, created_at, updated_at
		FROM candidates
		WHERE id = $1 AND campaign_id = $2`

	queryUpdateCandidate = `
		UPDATE candidates
		SET full_name = $1, email = $2, phone = $3, photo_url = $4, is_main = $5, updated_at = NOW()
		WHERE id = $6 AND campaign_id = $7`

	queryDeleteCandidate = `DELETE FROM candidates WHERE id = $1 AND campaign_id = $2`
)

func (r *repository) Create(ctx context.Context, campaignID string, c *Candidate) error {
	return r.pool.QueryRow(ctx, queryCreateCandidate,
		campaignID, c.FullName, c.Email, c.Phone, c.PhotoURL, c.IsMain,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *repository) GetByCampaign(ctx context.Context, campaignID string) ([]Candidate, error) {
	rows, err := r.pool.Query(ctx, queryGetByCampaign, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var candidates []Candidate
	for rows.Next() {
		var c Candidate
		var email, phone, photoURL *string
		if err := rows.Scan(&c.ID, &c.CampaignID, &c.FullName, &email, &phone, &photoURL, &c.IsMain, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		if email != nil { c.Email = *email }
		if phone != nil { c.Phone = *phone }
		if photoURL != nil { c.PhotoURL = *photoURL }
		candidates = append(candidates, c)
	}
	return candidates, rows.Err()
}

func (r *repository) GetByID(ctx context.Context, id string, campaignID string) (*Candidate, error) {
	var c Candidate
	var email, phone, photoURL *string
	if err := r.pool.QueryRow(ctx, queryGetByID, id, campaignID).Scan(
		&c.ID, &c.CampaignID, &c.FullName, &email, &phone, &photoURL, &c.IsMain, &c.CreatedAt, &c.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if email != nil { c.Email = *email }
	if phone != nil { c.Phone = *phone }
	if photoURL != nil { c.PhotoURL = *photoURL }
	return &c, nil
}

func (r *repository) Update(ctx context.Context, id string, campaignID string, c *Candidate) error {
	_, err := r.pool.Exec(ctx, queryUpdateCandidate,
		c.FullName, c.Email, c.Phone, c.PhotoURL, c.IsMain, id, campaignID,
	)
	return err
}

func (r *repository) Delete(ctx context.Context, id string, campaignID string) error {
	_, err := r.pool.Exec(ctx, queryDeleteCandidate, id, campaignID)
	return err
}
