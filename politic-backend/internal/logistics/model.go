package logistics

import "time"

type Driver struct {
	ID            string    `json:"id"`
	FullName      string    `json:"full_name"`
	Dni           string    `json:"dni"`
	Address       string    `json:"address,omitempty"`
	BloodType     string    `json:"blood_type,omitempty"`
	LicensePDFURL string    `json:"license_pdf_url,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type Vehicle struct {
	ID                   string    `json:"id"`
	CampaignID           string    `json:"campaign_id"`
	Plate                string    `json:"plate"`
	Model                string    `json:"model,omitempty"`
	DriverID             string    `json:"driver_id,omitempty"`
	DriverName           string    `json:"driver_name,omitempty"`
	DriverPhone          string    `json:"driver_phone,omitempty"`
	Status               string    `json:"status"`
	ImageURL             string    `json:"image_url,omitempty"`
	SoatPDFURL           string    `json:"soat_pdf_url,omitempty"`
	TecnomecanicaPDFURL  string    `json:"tecnomecanica_pdf_url,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
}

type InventoryItem struct {
	ID           string    `json:"id"`
	CampaignID   string    `json:"campaign_id"`
	ItemName     string    `json:"item_name"`
	ItemType     string    `json:"item_type"`
	TotalQty     int       `json:"total_qty"`
	AllocatedQty int       `json:"allocated_qty"`
	ImageURL     string    `json:"image_url,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type DispatchDetail struct {
	ID            string    `json:"id"`
	CampaignID    string    `json:"campaign_id"`
	InventoryID   string    `json:"inventory_id"`
	ItemName      string    `json:"item_name"`
	Quantity      int       `json:"quantity"`
	ReceiverID    string    `json:"receiver_id"`
	ReceiverName  string    `json:"receiver_name,omitempty"`
	VehiclePlate  string    `json:"vehicle_plate,omitempty"`
	DriverName    string    `json:"driver_name,omitempty"`
	QRCodeToken   string    `json:"qr_code_token"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

type Dispatch struct {
	ID          string    `json:"id"`
	CampaignID  string    `json:"campaign_id"`
	InventoryID string    `json:"inventory_id"`
	ReceiverID  string    `json:"receiver_id"`
	VehicleID   string    `json:"vehicle_id,omitempty"`
	Quantity    int       `json:"quantity"`
	QRCodeToken string    `json:"qr_code_token"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateDriverInput struct {
	FullName  string `form:"full_name" binding:"required"`
	Dni       string `form:"dni" binding:"required"`
	Address   string `form:"address"`
	BloodType string `form:"blood_type"`
}

type CreateVehicleInput struct {
	Plate      string `form:"plate" binding:"required"`
	Model      string `form:"model"`
	DriverID   string `form:"driver_id"`
	DriverName string `form:"driver_name"`
	DriverPhone string `form:"driver_phone"`
}

type CreateInventoryInput struct {
	ItemName string `form:"item_name" binding:"required"`
	ItemType string `form:"item_type" binding:"required,oneof=ALIMENTO PUBLICIDAD TRANSPORTE"`
	TotalQty int    `form:"total_qty" binding:"required,min=1"`
}

type CreateDispatchInput struct {
	InventoryID string `json:"inventory_id" binding:"required,uuid"`
	ReceiverID  string `json:"receiver_id" binding:"required,uuid"`
	VehicleID   string `json:"vehicle_id"`
	Quantity    int    `json:"quantity" binding:"required,min=1"`
}
