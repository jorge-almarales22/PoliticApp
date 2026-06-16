export interface DashboardMetrics {
  total_voters: number
  active_leaders: number
  coverage_efficiency?: number
}

export interface SectorData {
  sector_id: string
  name: string
  voters_count: number
  geojson: string
}
