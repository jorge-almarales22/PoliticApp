package geo

import "context"

type Service interface {
	GetSectorsReport(ctx context.Context, campaignID string) ([]SectorReport, error)
	GetDashboardMetrics(ctx context.Context, campaignID string) (*DashboardMetrics, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetSectorsReport(ctx context.Context, campaignID string) ([]SectorReport, error) {
	return s.repo.GetSectorsReport(ctx, campaignID)
}

func (s *service) GetDashboardMetrics(ctx context.Context, campaignID string) (*DashboardMetrics, error) {
	return s.repo.GetDashboardMetrics(ctx, campaignID)
}
