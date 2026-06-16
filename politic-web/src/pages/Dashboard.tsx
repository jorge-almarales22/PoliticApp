import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Users, UserCheck, Target, LogOut, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
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

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
          api.get<SectorData[]>('/geo/sectors'),
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

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

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
          api.get<SectorData[]>('/geo/sectors'),
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

    return () => {
      cancelled = true
    }
  }, [])

  const isLoading = state === 'loading' || state === 'idle'
  const hasError = state === 'error'
  const hasData = state === 'success'

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">SaaS Politico</h1>
            {user && (
              <p className="text-xs text-slate-500 mt-0.5">
                {user.role} · Campana {user.campaign_id.slice(0, 8)}&hellip;
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700
                       transition-colors hover:bg-slate-100 hover:text-red-600 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          >
            <LogOut size={16} />
            Cerrar Sesion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {hasError && (
          <div className="mb-8 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error al cargar los datos del servidor</p>
              <p className="text-xs text-red-600 mt-0.5">Verifica que el backend este corriendo en el puerto 8080</p>
            </div>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white
                         transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-indigo-50 shrink-0">
              <Users size={24} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Total Votantes Registrados</p>
              {isLoading && (
                <div className="mt-2 h-8 w-24 bg-slate-200 rounded-md animate-pulse" />
              )}
              {hasData && metrics && (
                <p className="text-3xl font-bold text-slate-800 mt-1">{formatNumber(metrics.total_voters)}</p>
              )}
              {hasError && (
                <p className="text-2xl font-bold text-slate-300 mt-1">&mdash;</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 shrink-0">
              <UserCheck size={24} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Lideres Activos en Calle</p>
              {isLoading && (
                <div className="mt-2 h-8 w-20 bg-slate-200 rounded-md animate-pulse" />
              )}
              {hasData && metrics && (
                <p className="text-3xl font-bold text-slate-800 mt-1">{formatNumber(metrics.active_leaders)}</p>
              )}
              {hasError && (
                <p className="text-2xl font-bold text-slate-300 mt-1">&mdash;</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-amber-50 shrink-0">
              <Target size={24} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Eficiencia de Cobertura</p>
              {isLoading && (
                <div className="mt-2 h-8 w-20 bg-slate-200 rounded-md animate-pulse" />
              )}
              {hasData && metrics !== null && (
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {metrics.coverage_efficiency != null
                    ? formatEfficiency(metrics.coverage_efficiency)
                    : '—'}
                </p>
              )}
              {hasError && (
                <p className="text-2xl font-bold text-slate-300 mt-1">&mdash;</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">Sectores con al menos 1 votante</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Mapa de Cobertura — Valledupar</h2>
            {hasData && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f3f4f6' }} />
                  <span>Sin votantes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#60a5fa' }} />
                  <span>1 - 10</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1e40af' }} />
                  <span>11+</span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200">
            {isLoading && (
              <div className="h-[550px] bg-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">Cargando mapa...</p>
                </div>
              </div>
            )}

            {hasError && !isLoading && (
              <div className="h-[550px] bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No se pudo cargar la informacion geografica</p>
                </div>
              </div>
            )}

            {hasData && (
              <div className="w-full">
                <MapContainer
                  center={[10.46314, -73.25322]}
                  zoom={13}
                  className="h-[500px] w-full rounded-lg z-0"
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
                          layer.bindTooltip(`${sector.name} - Votantes: ${sector.voters_count}`, {
                            sticky: true,
                          })
                        }}
                      />
                    )
                  })}
                </MapContainer>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
