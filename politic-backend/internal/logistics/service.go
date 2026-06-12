package logistics

import "context"

type Service interface {
	CreateVehicle(ctx context.Context, input CreateVehicleInput, campaignID string) (*Vehicle, error)
	GetVehicles(ctx context.Context, campaignID string) ([]Vehicle, error)
	CreateInventory(ctx context.Context, input CreateInventoryInput, campaignID string) (*InventoryItem, error)
	SubmitDispatch(ctx context.Context, input CreateDispatchInput, campaignID string) (*Dispatch, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateVehicle(ctx context.Context, input CreateVehicleInput, campaignID string) (*Vehicle, error) {
	v := &Vehicle{
		Plate:       input.Plate,
		Model:       input.Model,
		DriverName:  input.DriverName,
		DriverPhone: input.DriverPhone,
	}

	if err := s.repo.CreateVehicle(ctx, campaignID, v); err != nil {
		return nil, err
	}

	v.CampaignID = campaignID
	return v, nil
}

func (s *service) GetVehicles(ctx context.Context, campaignID string) ([]Vehicle, error) {
	return s.repo.GetVehicles(ctx, campaignID)
}

func (s *service) CreateInventory(ctx context.Context, input CreateInventoryInput, campaignID string) (*InventoryItem, error) {
	item := &InventoryItem{
		ItemName: input.ItemName,
		ItemType: input.ItemType,
		TotalQty: input.TotalQty,
	}

	if err := s.repo.CreateInventory(ctx, campaignID, item); err != nil {
		return nil, err
	}

	item.CampaignID = campaignID
	return item, nil
}

func (s *service) SubmitDispatch(ctx context.Context, input CreateDispatchInput, campaignID string) (*Dispatch, error) {
	d := &Dispatch{
		InventoryID: input.InventoryID,
		ReceiverID:  input.ReceiverID,
		Quantity:    input.Quantity,
	}

	if err := s.repo.CreateDispatch(ctx, campaignID, d); err != nil {
		return nil, err
	}

	d.CampaignID = campaignID
	return d, nil
}
