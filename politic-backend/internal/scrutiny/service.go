package scrutiny

import "context"

type Service interface {
	ProcessReport(ctx context.Context, report *ScrutinyReport) error
	GetReports(ctx context.Context, campaignID string) ([]ScrutinyReport, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) ProcessReport(ctx context.Context, report *ScrutinyReport) error {
	return s.repo.Create(ctx, report)
}

func (s *service) GetReports(ctx context.Context, campaignID string) ([]ScrutinyReport, error) {
	return s.repo.GetSummaryByCampaign(ctx, campaignID)
}
