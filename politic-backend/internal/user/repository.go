package user

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Create(ctx context.Context, u *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByCampaign(ctx context.Context, campaignID string) ([]User, error)
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

const (
	queryCreateUser = `
		INSERT INTO users (email, password_hash, full_name, role, campaign_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at`

	queryGetByEmail = `
		SELECT id, email, password_hash, full_name, role, campaign_id, created_at, updated_at
		FROM users
		WHERE email = $1`

	queryGetByCampaign = `
		SELECT id, email, password_hash, full_name, role, campaign_id, created_at, updated_at
		FROM users
		WHERE campaign_id = $1
		ORDER BY full_name ASC`
)

func (r *repository) Create(ctx context.Context, u *User) error {
	return r.pool.QueryRow(ctx, queryCreateUser,
		u.Email, u.PasswordHash, u.FullName, u.Role, u.CampaignID,
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
}

func (r *repository) GetByEmail(ctx context.Context, email string) (*User, error) {
	u := &User{}
	err := r.pool.QueryRow(ctx, queryGetByEmail, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Role, &u.CampaignID,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *repository) GetByCampaign(ctx context.Context, campaignID string) ([]User, error) {
	rows, err := r.pool.Query(ctx, queryGetByCampaign, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Role, &u.CampaignID, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}
