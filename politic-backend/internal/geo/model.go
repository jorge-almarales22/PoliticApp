package geo

type SectorReport struct {
	SectorID    string `json:"sector_id"`
	Name        string `json:"name"`
	SectorType  string `json:"sector_type"`
	VotersCount int    `json:"voters_count"`
	GeoJSON     string `json:"geojson"`
}

type DashboardMetrics struct {
	TotalVoters  int `json:"total_voters"`
	ActiveLeaders int `json:"active_leaders"`
}
