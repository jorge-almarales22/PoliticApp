package candidate

import (
	"strings"
	"time"
)

type Candidate struct {
	ID         string    `json:"id"`
	CampaignID string    `json:"campaign_id"`
	FullName   string    `json:"full_name"`
	Email      string    `json:"email,omitempty"`
	Phone      string    `json:"phone,omitempty"`
	PhotoURL   string    `json:"photo_url,omitempty"`
	IsMain     bool      `json:"is_main"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type CreateCandidateInput struct {
	FullName string `form:"full_name" binding:"required"`
	Email    string `form:"email"`
	Phone    string `form:"phone"`
	IsMain   bool   `form:"is_main"`
}

var accentReplacer = strings.NewReplacer(
	"á", "&aacute;", "é", "&eacute;", "í", "&iacute;", "ó", "&oacute;", "ú", "&uacute;",
	"Á", "&Aacute;", "É", "&Eacute;", "Í", "&Iacute;", "Ó", "&Oacute;", "Ú", "&Uacute;",
	"ñ", "&ntilde;", "Ñ", "&Ntilde;",
	"ü", "&uuml;", "Ü", "&Uuml;",
)

func sanitizeFullName(name string) string {
	return accentReplacer.Replace(name)
}
