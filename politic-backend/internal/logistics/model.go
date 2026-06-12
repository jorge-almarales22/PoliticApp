package logistics

import "time"

type Vehicle struct {
	ID          string    `json:"id"`
	CampaignID  string    `json:"campaign_id"`
	Plate       string    `json:"plate"`
	Model       string    `json:"model,omitempty"`
	DriverName  string    `json:"driver_name"`
	DriverPhone string    `json:"driver_phone,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type InventoryItem struct {
	ID           string    `json:"id"`
	CampaignID   string    `json:"campaign_id"`
	ItemName     string    `json:"item_name"`
	ItemType     string    `json:"item_type"`
	TotalQty     int       `json:"total_qty"`
	AllocatedQty int       `json:"allocated_qty"`
	CreatedAt    time.Time `json:"created_at"`
}

type Dispatch struct {
	ID          string    `json:"id"`
	CampaignID  string    `json:"campaign_id"`
	InventoryID string    `json:"inventory_id"`
	ReceiverID  string    `json:"receiver_id"`
	Quantity    int       `json:"quantity"`
	QRCodeToken string    `json:"qr_code_token"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateVehicleInput struct {
	Plate       string `json:"plate" binding:"required"`
	Model       string `json:"model"`
	DriverName  string `json:"driver_name" binding:"required"`
	DriverPhone string `json:"driver_phone"`
}

type CreateInventoryInput struct {
	ItemName string `json:"item_name" binding:"required"`
	ItemType string `json:"item_type" binding:"required,oneof=ALIMENTO PUBLICIDAD TRANSPORTE"`
	TotalQty int    `json:"total_qty" binding:"required,min=1"`
}

type CreateDispatchInput struct {
	InventoryID string `json:"inventory_id" binding:"required,uuid"`
	ReceiverID  string `json:"receiver_id" binding:"required,uuid"`
	Quantity    int    `json:"quantity" binding:"required,min=1"`
}
