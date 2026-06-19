package logistics

import "context"

type Service interface {
	CreateDriver(ctx context.Context, input CreateDriverInput, licenseURL string) (*Driver, error)
	GetDrivers(ctx context.Context) ([]Driver, error)

	CreateVehicle(ctx context.Context, input CreateVehicleInput, campaignID string, imageURL, soatURL, tecnoURL string) (*Vehicle, error)
	GetVehicles(ctx context.Context, campaignID string) ([]Vehicle, error)
	UpdateVehicleStatus(ctx context.Context, id string, campaignID string, status string) error

	CreateInventory(ctx context.Context, input CreateInventoryInput, campaignID string, imageURL string) (*InventoryItem, error)
	GetInventory(ctx context.Context, campaignID string) ([]InventoryItem, error)

	SubmitDispatch(ctx context.Context, input CreateDispatchInput, campaignID string) (*Dispatch, error)
	GetDispatches(ctx context.Context, campaignID string) ([]DispatchDetail, error)
	GetDispatchByID(ctx context.Context, id string) (*DispatchDetail, error)
	ReceiveDispatch(ctx context.Context, id string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateDriver(ctx context.Context, input CreateDriverInput, licenseURL string) (*Driver, error) {
	d := &Driver{
		FullName:      input.FullName,
		Dni:           input.Dni,
		Address:       input.Address,
		BloodType:     input.BloodType,
		LicensePDFURL: licenseURL,
	}
	if err := s.repo.CreateDriver(ctx, d); err != nil {
		return nil, err
	}
	return d, nil
}

func (s *service) GetDrivers(ctx context.Context) ([]Driver, error) {
	return s.repo.GetDrivers(ctx)
}

func (s *service) CreateVehicle(ctx context.Context, input CreateVehicleInput, campaignID string, imageURL, soatURL, tecnoURL string) (*Vehicle, error) {
	v := &Vehicle{
		Plate:               input.Plate,
		Model:               input.Model,
		DriverID:            input.DriverID,
		DriverName:          input.DriverName,
		DriverPhone:         input.DriverPhone,
		ImageURL:            imageURL,
		SoatPDFURL:          soatURL,
		TecnomecanicaPDFURL: tecnoURL,
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

func (s *service) UpdateVehicleStatus(ctx context.Context, id string, campaignID string, status string) error {
	return s.repo.UpdateVehicleStatus(ctx, id, campaignID, status)
}

func (s *service) CreateInventory(ctx context.Context, input CreateInventoryInput, campaignID string, imageURL string) (*InventoryItem, error) {
	item := &InventoryItem{
		ItemName: input.ItemName,
		ItemType: input.ItemType,
		TotalQty: input.TotalQty,
		ImageURL: imageURL,
	}
	if err := s.repo.CreateInventory(ctx, campaignID, item); err != nil {
		return nil, err
	}
	item.CampaignID = campaignID
	return item, nil
}

func (s *service) GetInventory(ctx context.Context, campaignID string) ([]InventoryItem, error) {
	return s.repo.GetInventory(ctx, campaignID)
}

func (s *service) SubmitDispatch(ctx context.Context, input CreateDispatchInput, campaignID string) (*Dispatch, error) {
	d := &Dispatch{
		InventoryID: input.InventoryID,
		ReceiverID:  input.ReceiverID,
		VehicleID:   input.VehicleID,
		Quantity:    input.Quantity,
	}
	if err := s.repo.CreateDispatch(ctx, campaignID, d); err != nil {
		return nil, err
	}
	d.CampaignID = campaignID
	return d, nil
}

func (s *service) GetDispatches(ctx context.Context, campaignID string) ([]DispatchDetail, error) {
	return s.repo.GetDispatches(ctx, campaignID)
}

func (s *service) GetDispatchByID(ctx context.Context, id string) (*DispatchDetail, error) {
	return s.repo.GetDispatchByID(ctx, id)
}

func (s *service) ReceiveDispatch(ctx context.Context, id string) error {
	return s.repo.ReceiveDispatch(ctx, id)
}
