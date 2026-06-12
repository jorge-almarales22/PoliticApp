package voter

import "time"

type Voter struct {
	ID         string    `json:"id"`
	FullName   string    `json:"full_name"`
	Dni        string    `json:"dni"`
	Address    string    `json:"address,omitempty"`
	Phone      string    `json:"phone,omitempty"`
	Email      string    `json:"email,omitempty"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	CampaignID string    `json:"campaign_id"`
	Tags       []string  `json:"tags"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type CreateVoterInput struct {
	FullName  string   `json:"full_name" binding:"required"`
	Dni       string   `json:"dni" binding:"required"`
	Address   string   `json:"address"`
	Phone     string   `json:"phone"`
	Email     string   `json:"email" binding:"omitempty,email"`
	Latitude  float64  `json:"latitude" binding:"required"`
	Longitude float64  `json:"longitude" binding:"required"`
	Tags      []string `json:"tags"`
}

type VoterInputMapped struct {
	ID        string
	FullName  string
	Dni       string
	Address   string
	Phone     string
	Email     string
	Latitude  float64
	Longitude float64
	Tags      []string
	CreatedAt time.Time
	UpdatedAt time.Time
}
