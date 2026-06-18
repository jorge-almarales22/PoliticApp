package voter

import "context"

type Service interface {
	CreateVoter(ctx context.Context, input CreateVoterInput, campaignID string) (*Voter, error)
	GetVoters(ctx context.Context, campaignID string) ([]Voter, error)
	UpdateVoter(ctx context.Context, id string, campaignID string, input CreateVoterInput) (*Voter, error)
	DeleteVoter(ctx context.Context, id string, campaignID string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateVoter(ctx context.Context, input CreateVoterInput, campaignID string) (*Voter, error) {
	mapped := &VoterInputMapped{
		FullName:  input.FullName,
		Dni:       input.Dni,
		Address:   input.Address,
		Phone:     input.Phone,
		Email:     input.Email,
		Latitude:  input.Latitude,
		Longitude: input.Longitude,
		Tags:      input.Tags,
	}

	if err := s.repo.Create(ctx, campaignID, mapped); err != nil {
		return nil, err
	}

	voter := &Voter{
		ID:         mapped.ID,
		FullName:   mapped.FullName,
		Dni:        mapped.Dni,
		Address:    mapped.Address,
		Phone:      mapped.Phone,
		Email:      mapped.Email,
		Latitude:   mapped.Latitude,
		Longitude:  mapped.Longitude,
		CampaignID: campaignID,
		Tags:       mapped.Tags,
		CreatedAt:  mapped.CreatedAt,
		UpdatedAt:  mapped.UpdatedAt,
	}

	return voter, nil
}

func (s *service) GetVoters(ctx context.Context, campaignID string) ([]Voter, error) {
	return s.repo.GetByCampaign(ctx, campaignID)
}

func (s *service) UpdateVoter(ctx context.Context, id string, campaignID string, input CreateVoterInput) (*Voter, error) {
	mapped := &VoterInputMapped{
		FullName:  input.FullName,
		Dni:       input.Dni,
		Address:   input.Address,
		Phone:     input.Phone,
		Email:     input.Email,
		Latitude:  input.Latitude,
		Longitude: input.Longitude,
		Tags:      input.Tags,
	}

	if err := s.repo.Update(ctx, id, campaignID, mapped); err != nil {
		return nil, err
	}

	voter := &Voter{
		ID:         id,
		FullName:   mapped.FullName,
		Dni:        mapped.Dni,
		Address:    mapped.Address,
		Phone:      mapped.Phone,
		Email:      mapped.Email,
		Latitude:   mapped.Latitude,
		Longitude:  mapped.Longitude,
		CampaignID: campaignID,
		Tags:       mapped.Tags,
	}

	return voter, nil
}

func (s *service) DeleteVoter(ctx context.Context, id string, campaignID string) error {
	return s.repo.Delete(ctx, id, campaignID)
}
