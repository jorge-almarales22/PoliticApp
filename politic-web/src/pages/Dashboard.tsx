import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Users, UserCheck, Target, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'
import api from '../services/api'
import type { DashboardMetrics, SectorData } from '../types'

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-CO').format(n)
}

function formatEfficiency(value: number): string {
  if (value <= 1 && value >= 0) return `${Math.round(value * 100)}%`
  return `${Math.round(value)}%`
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error'

const CARD_STYLES = {
  base: 'group bg-white rounded-2xl border border-slate-100 p-6 flex items-start gap-5 transition-all duration-300 hover:border-slate-200 hover:shadow-md',
  icon: (color: string) => `p-3 rounded-xl bg-${color}-50 shrink-0 transition-transform duration-300 group-hover:scale-110`,
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [state, setState] = useState<LoadingState>('idle')
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchDashboardData() {
      setState('loading')
      try {
        const [metricsRes, sectorsRes] = await Promise.all([
          api.get<DashboardMetrics>('/geo/dashboard-metrics'),
          api.get<{ sectors: SectorData[] }>('/geo/sectors'),
        ])
        if (cancelled) return
        setMetrics(metricsRes.data)
        setSectors(sectorsRes.data.sectors ?? [])
        setState('success')
      } catch {
        if (cancelled) return
        setState('error')
      }
    }

    fetchDashboardData()
    return () => { cancelled = true }
  }, [])

  const handleRetry = useCallback(() => {
    setState('idle')
    setMetrics(null)
    setSectors([])
    let cancelled = false

    async function fetchDashboardData() {
      setState('loading')
      try {
        const [metricsRes, sectorsRes] = await Promise.all([
          api.get<DashboardMetrics>('/geo/dashboard-metrics'),
          api.get<{ sectors: SectorData[] }>('/geo/sectors'),
        ])
        if (cancelled) return
        setMetrics(metricsRes.data)
        setSectors(sectorsRes.data.sectors ?? [])
        setState('success')
      } catch {
        if (cancelled) return
        setState('error')
      }
    }

    fetchDashboardData()
    return () => { cancelled = true }
  }, [])

  const isLoading = state === 'loading' || state === 'idle'
  const hasError = state === 'error'
  const hasData = state === 'success'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Resumen general de tu campana</p>
        </div>
        {hasData && metrics && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <TrendingUp size={14} />
            Datos actualizados
          </div>
        )}
      </div>

      {hasError && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5 flex items-start gap-4">
          <div className="p-2 rounded-xl bg-red-100 shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">Error al cargar los datos</p>
            <p className="text-xs text-red-600 mt-0.5">Verifica que el backend este corriendo en el puerto 8080</p>
          </div>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white
                       transition-all hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/20"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={CARD_STYLES.base}>
          <div className={CARD_STYLES.icon('indigo')}>
            <Users size={22} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Votantes</p>
            {isLoading && <div className="h-9 w-20 bg-slate-100 rounded-lg animate-pulse" />}
            {hasData && metrics && (
              <p className="text-3xl font-bold text-slate-800 tracking-tight">{formatNumber(metrics.total_voters)}</p>
            )}
            {hasError && <p className="text-3xl font-bold text-slate-200">&mdash;</p>}
          </div>
        </div>

        <div className={CARD_STYLES.base}>
          <div className={CARD_STYLES.icon('emerald')}>
            <UserCheck size={22} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Lideres Activos</p>
            {isLoading && <div className="h-9 w-20 bg-slate-100 rounded-lg animate-pulse" />}
            {hasData && metrics && (
              <p className="text-3xl font-bold text-slate-800 tracking-tight">{formatNumber(metrics.active_leaders)}</p>
            )}
            {hasError && <p className="text-3xl font-bold text-slate-200">&mdash;</p>}
          </div>
        </div>

        <div className={CARD_STYLES.base}>
          <div className={CARD_STYLES.icon('amber')}>
            <Target size={22} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Cobertura</p>
            {isLoading && <div className="h-9 w-20 bg-slate-100 rounded-lg animate-pulse" />}
            {hasData && metrics && (
              <p className="text-3xl font-bold text-slate-800 tracking-tight">
                {metrics.coverage_efficiency != null ? formatEfficiency(metrics.coverage_efficiency) : '—'}
              </p>
            )}
            {hasError && <p className="text-3xl font-bold text-slate-200">&mdash;</p>}
            <p className="text-[11px] text-slate-400 mt-0.5">Sectores con ≥ 1 votante</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Mapa de Cobertura</h2>
            <p className="text-xs text-slate-400 mt-0.5">Valledupar &middot; Distribucion geografica de votantes</p>
          </div>
          {hasData && (
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f3f4f6' }} />
                <span>0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#60a5fa' }} />
                <span>1–10</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1e40af' }} />
                <span>11+</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-100">
          {isLoading && (
            <div className="h-[480px] bg-slate-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Cargando mapa...</p>
              </div>
            </div>
          )}

          {hasError && !isLoading && (
            <div className="h-[480px] bg-slate-50 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No se pudo cargar el mapa</p>
              </div>
            </div>
          )}

          {hasData && (
            <div className="w-full">
              <MapContainer
                center={[10.46314, -73.25322]}
                zoom={13}
                className="h-[480px] w-full z-0"
                zoomControl
                whenReady={() => setMapReady(true)}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapReady && sectors.map((sector) => {
                  const geojson = JSON.parse(sector.geojson)
                  const count = sector.voters_count

                  const style =
                    count === 0
                      ? { fillColor: '#f3f4f6', fillOpacity: 0.4, color: '#9ca3af', weight: 1 }
                      : count <= 10
                        ? { fillColor: '#60a5fa', fillOpacity: 0.6, color: '#9ca3af', weight: 1 }
                        : { fillColor: '#1e40af', fillOpacity: 0.7, color: '#9ca3af', weight: 1 }

                  return (
                    <GeoJSON
                      key={sector.sector_id}
                      data={geojson}
                      style={style}
                      onEachFeature={(_feature, layer) => {
                        layer.bindTooltip(`${sector.name} - Votantes: ${sector.voters_count}`, { sticky: true })
                      }}
                    />
                  )
                })}
              </MapContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
