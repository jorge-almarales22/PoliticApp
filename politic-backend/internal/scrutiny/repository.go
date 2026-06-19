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
			(campaign_id, witness_id, voting_place, table_number, zone,
			 votos_blanco, votos_nulos, candidate_votes,
			 votes_candidate, votes_rival_1, votes_rival_2, e14_image_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at`

	queryGetSummaryByCampaign = `
		SELECT id, campaign_id, witness_id, voting_place, table_number,
		       zone, votos_blanco, votos_nulos,
		       COALESCE(votes_candidate, 0), COALESCE(votes_rival_1, 0), COALESCE(votes_rival_2, 0),
		       candidate_votes, e14_image_url, created_at, updated_at
		FROM scrutiny_reports
		WHERE campaign_id = $1
		ORDER BY created_at DESC`
)

func (r *repository) Create(ctx context.Context, report *ScrutinyReport) error {
	return r.pool.QueryRow(ctx, queryCreateReport,
		report.CampaignID, report.WitnessID, report.VotingPlace, report.TableNumber,
		report.Zone, report.VotosBlanco, report.VotosNulos, report.CandidateVotes,
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
		var imageURL, zone, candidateVotes *string
		var votosBlanco, votosNulos *int
		if err := rows.Scan(
			&rep.ID, &rep.CampaignID, &rep.WitnessID, &rep.VotingPlace, &rep.TableNumber,
			&zone, &votosBlanco, &votosNulos,
			&rep.VotesCandidate, &rep.VotesRival1, &rep.VotesRival2,
			&candidateVotes, &imageURL,
			&rep.CreatedAt, &rep.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if imageURL != nil {
			rep.E14ImageURL = *imageURL
		}
		if zone != nil {
			rep.Zone = *zone
		}
		if votosBlanco != nil {
			rep.VotosBlanco = *votosBlanco
		}
		if votosNulos != nil {
			rep.VotosNulos = *votosNulos
		}
		if candidateVotes != nil {
			rep.CandidateVotes = *candidateVotes
		}
		reports = append(reports, rep)
	}

	return reports, rows.Err()
}
