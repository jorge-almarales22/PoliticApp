package scrutiny

import "time"

type ScrutinyReport struct {
	ID             string    `json:"id"`
	CampaignID     string    `json:"campaign_id"`
	WitnessID      string    `json:"witness_id"`
	VotingPlace    string    `json:"voting_place"`
	TableNumber    int       `json:"table_number"`
	VotesCandidate int       `json:"votes_candidate"`
	VotesRival1    int       `json:"votes_rival_1"`
	VotesRival2    int       `json:"votes_rival_2"`
	E14ImageURL    string    `json:"e14_image_url,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateScrutinyInput struct {
	VotingPlace    string `form:"voting_place" binding:"required"`
	TableNumber    int    `form:"table_number" binding:"required"`
	VotesCandidate int    `form:"votes_candidate" binding:"required"`
	VotesRival1    int    `form:"votes_rival_1"`
	VotesRival2    int    `form:"votes_rival_2"`
}
