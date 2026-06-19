package scrutiny

import (
	"context"
	"encoding/json"

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
			 votos_blanco, votos_nulos, candidate_votes, e14_image_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`

	queryGetSummaryByCampaign = `
		SELECT id, campaign_id, witness_id, voting_place, table_number,
		       zone, votos_blanco, votos_nulos,
		       candidate_votes, e14_image_url, created_at, updated_at
		FROM scrutiny_reports
		WHERE campaign_id = $1
		ORDER BY created_at DESC`
)

func (r *repository) Create(ctx context.Context, report *ScrutinyReport) error {
	cvJSON, err := json.Marshal(report.CandidateVotes)
	if err != nil {
		return err
	}

	return r.pool.QueryRow(ctx, queryCreateReport,
		report.CampaignID, report.WitnessID, report.VotingPlace, report.TableNumber,
		report.Zone, report.VotosBlanco, report.VotosNulos, string(cvJSON), report.E14ImageURL,
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
		var imageURL, zone *string
		var votosBlanco, votosNulos *int
		var candidateVotesRaw []byte
		if err := rows.Scan(
			&rep.ID, &rep.CampaignID, &rep.WitnessID, &rep.VotingPlace, &rep.TableNumber,
			&zone, &votosBlanco, &votosNulos,
			&candidateVotesRaw, &imageURL,
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
		if len(candidateVotesRaw) > 0 {
			json.Unmarshal(candidateVotesRaw, &rep.CandidateVotes)
		}
		if rep.CandidateVotes == nil {
			rep.CandidateVotes = []CandidateVoteEntry{}
		}
		reports = append(reports, rep)
	}

	return reports, rows.Err()
}
