package geo

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	GetSectorsReport(ctx context.Context, campaignID string) ([]SectorReport, error)
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

const querySectorsReport = `
	SELECT
		s.id,
		s.name,
		s.sector_type,
		COUNT(v.id) as voters_count,
		ST_AsGeoJSON(s.boundary) as geojson
	FROM campaign_sectors s
	LEFT JOIN voters v ON ST_Contains(s.boundary, v.location) AND v.campaign_id = $1
	WHERE s.campaign_id = $1
	GROUP BY s.id, s.name, s.sector_type, s.boundary`

func (r *repository) GetSectorsReport(ctx context.Context, campaignID string) ([]SectorReport, error) {
	rows, err := r.pool.Query(ctx, querySectorsReport, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []SectorReport
	for rows.Next() {
		var sr SectorReport
		if err := rows.Scan(&sr.SectorID, &sr.Name, &sr.SectorType, &sr.VotersCount, &sr.GeoJSON); err != nil {
			return nil, err
		}
		reports = append(reports, sr)
	}

	return reports, rows.Err()
}
