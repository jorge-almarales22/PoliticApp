package user

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Role         string    `json:"role"`
	CampaignID   *string   `json:"campaign_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type RegisterInput struct {
	CampaignID string `json:"campaign_id" binding:"required,uuid"`
	FullName   string `json:"full_name"  binding:"required"`
	Email      string `json:"email"      binding:"required,email"`
	Password   string `json:"password"   binding:"required,min=6"`
	Role       string `json:"role"       binding:"required,oneof=admin manager analyst viewer"`
	Phone      string `json:"phone"      binding:"required"`
}

type LoginInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}
