package candidate

import "context"

type Service interface {
	CreateCandidate(ctx context.Context, input CreateCandidateInput, campaignID string, photoURL string) (*Candidate, error)
	GetCandidates(ctx context.Context, campaignID string) ([]Candidate, error)
	GetCandidate(ctx context.Context, id string, campaignID string) (*Candidate, error)
	UpdateCandidate(ctx context.Context, id string, campaignID string, input CreateCandidateInput, photoURL string) (*Candidate, error)
	DeleteCandidate(ctx context.Context, id string, campaignID string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateCandidate(ctx context.Context, input CreateCandidateInput, campaignID string, photoURL string) (*Candidate, error) {
	c := &Candidate{
		FullName: sanitizeFullName(input.FullName),
		Email:    input.Email,
		Phone:    input.Phone,
		PhotoURL: photoURL,
		IsMain:   input.IsMain,
	}
	if err := s.repo.Create(ctx, campaignID, c); err != nil {
		return nil, err
	}
	c.CampaignID = campaignID
	return c, nil
}

func (s *service) GetCandidates(ctx context.Context, campaignID string) ([]Candidate, error) {
	return s.repo.GetByCampaign(ctx, campaignID)
}

func (s *service) GetCandidate(ctx context.Context, id string, campaignID string) (*Candidate, error) {
	return s.repo.GetByID(ctx, id, campaignID)
}

func (s *service) UpdateCandidate(ctx context.Context, id string, campaignID string, input CreateCandidateInput, photoURL string) (*Candidate, error) {
	c := &Candidate{
		ID:       id,
		FullName: sanitizeFullName(input.FullName),
		Email:    input.Email,
		Phone:    input.Phone,
		PhotoURL: photoURL,
		IsMain:   input.IsMain,
	}
	if err := s.repo.Update(ctx, id, campaignID, c); err != nil {
		return nil, err
	}
	c.CampaignID = campaignID
	return c, nil
}

func (s *service) DeleteCandidate(ctx context.Context, id string, campaignID string) error {
	return s.repo.Delete(ctx, id, campaignID)
}
