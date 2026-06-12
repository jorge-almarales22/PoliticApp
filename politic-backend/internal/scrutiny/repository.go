package scrutiny

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Create(ctx context.Context, report *ScrutinyReport) error
	GetSummaryByCampaign(ctx context.Context, campaignID string) ([]ScrutinyReport, error)
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

const (
	queryCreateReport = `
		INSERT INTO scrutiny_reports
			(campaign_id, witness_id, voting_place, table_number, votes_candidate, votes_rival_1, votes_rival_2, e14_image_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`

	queryGetSummaryByCampaign = `
		SELECT id, campaign_id, witness_id, voting_place, table_number,
		       votes_candidate, votes_rival_1, votes_rival_2,
		       e14_image_url, created_at, updated_at
		FROM scrutiny_reports
		WHERE campaign_id = $1
		ORDER BY created_at DESC`
)

func (r *repository) Create(ctx context.Context, report *ScrutinyReport) error {
	return r.pool.QueryRow(ctx, queryCreateReport,
		report.CampaignID, report.WitnessID, report.VotingPlace, report.TableNumber,
		report.VotesCandidate, report.VotesRival1, report.VotesRival2, report.E14ImageURL,
	).Scan(&report.ID, &report.CreatedAt, &report.UpdatedAt)
}

func (r *repository) GetSummaryByCampaign(ctx context.Context, campaignID string) ([]ScrutinyReport, error) {
	rows, err := r.pool.Query(ctx, queryGetSummaryByCampaign, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []ScrutinyReport
	for rows.Next() {
		var rep ScrutinyReport
		var imageURL *string
		if err := rows.Scan(
			&rep.ID, &rep.CampaignID, &rep.WitnessID, &rep.VotingPlace, &rep.TableNumber,
			&rep.VotesCandidate, &rep.VotesRival1, &rep.VotesRival2, &imageURL,
			&rep.CreatedAt, &rep.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if imageURL != nil {
			rep.E14ImageURL = *imageURL
		}
		reports = append(reports, rep)
	}

	return reports, rows.Err()
}
