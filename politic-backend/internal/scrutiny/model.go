package scrutiny

import (
	"encoding/json"
	"time"
)

type ScrutinyReport struct {
	ID             string              `json:"id"`
	CampaignID     string              `json:"campaign_id"`
	WitnessID      string              `json:"witness_id"`
	VotingPlace    string              `json:"voting_place"`
	TableNumber    int                 `json:"table_number"`
	Zone           string              `json:"zone,omitempty"`
	VotosBlanco    int                 `json:"votos_blanco"`
	VotosNulos     int                 `json:"votos_nulos"`
	CandidateVotes []CandidateVoteEntry `json:"candidate_votes"`
	E14ImageURL    string              `json:"e14_image_url,omitempty"`
	CreatedAt      time.Time           `json:"created_at"`
	UpdatedAt      time.Time           `json:"updated_at"`
}

type CandidateVoteEntry struct {
	CandidateID string `json:"candidate_id"`
	Votes       int    `json:"votes"`
}

type CreateScrutinyInput struct {
	VotingPlace    string `form:"voting_place" binding:"required"`
	TableNumber    int    `form:"table_number" binding:"required"`
	Zone           string `form:"zone"`
	VotosBlanco    int    `form:"votos_blanco"`
	VotosNulos     int    `form:"votos_nulos"`
	CandidateVotes string `form:"candidate_votes"`
}

func ParseCandidateVotes(raw string) ([]CandidateVoteEntry, error) {
	if raw == "" {
		return []CandidateVoteEntry{}, nil
	}
	var entries []CandidateVoteEntry
	if err := json.Unmarshal([]byte(raw), &entries); err != nil {
		return nil, err
	}
	return entries, nil
}
