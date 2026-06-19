import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, AlertTriangle, Truck, Package } from 'lucide-react'
import api from '../services/api'

interface DispatchInfo {
  id: string
  item_name: string
  quantity: number
  receiver_name: string
  vehicle_plate: string
  status: string
}

export default function LogisticsVerify() {
  const [searchParams] = useSearchParams()
  const dispatchId = searchParams.get('dispatch_id') ?? ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dispatch, setDispatch] = useState<DispatchInfo | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!dispatchId) {
      setError('No se encontro el ID de despacho en la URL. Escanea un codigo QR valido.')
      setLoading(false)
      return
    }

    async function fetchDispatch() {
      setLoading(true)
      try {
        const res = await api.get<{ dispatches: DispatchInfo[] }>('/logistics/dispatch')
        const found = (res.data.dispatches ?? []).find((d) => d.id === dispatchId)
        if (!found) {
          setError('Despacho no encontrado. Verifica que el codigo QR sea valido.')
        } else {
          setDispatch(found)
          if (found.status === 'ENTREGADO') setConfirmed(true)
        }
      } catch {
        setError('Error al consultar el despacho. Intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchDispatch()
  }, [dispatchId])

  const handleConfirm = async () => {
    if (!dispatchId || confirmed) return
    setConfirming(true)
    try {
      await api.post(`/logistics/dispatch/${dispatchId}/receive`)
      setConfirmed(true)
    } catch {
      setError('Error al confirmar la recepcion. Intenta de nuevo.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {loading && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 text-center">
            <Loader2 size={36} className="text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Consultando despacho...</p>
            <p className="text-xs text-slate-400 mt-1">Verificando codigo QR</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Codigo Invalido</h2>
            <p className="text-sm text-slate-500">{error}</p>
          </div>
        )}

        {!loading && !error && dispatch && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
            {confirmed ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-5">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Recepcion Confirmada</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Has recibido <strong className="text-slate-800">{dispatch.quantity} {dispatch.item_name}</strong>
                </p>
                <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600"><Truck size={14} /> {dispatch.vehicle_plate || 'Sin vehiculo'}</div>
                  <div className="flex items-center gap-2 text-slate-600"><Package size={14} /> {dispatch.item_name} x{dispatch.quantity}</div>
                  <p className="text-xs text-slate-400 pt-2">Despacho #{dispatch.id.slice(0, 8)}</p>
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 mb-5">
                  <Package size={32} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Despacho en Camino</h2>
                <p className="text-sm text-slate-500 mb-2">Revisa el contenido antes de confirmar</p>

                <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm mb-5">
                  <div className="flex justify-between"><span className="text-slate-400">Material</span><span className="text-slate-800 font-medium">{dispatch.item_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Cantidad</span><span className="text-slate-800 font-mono font-semibold">{dispatch.quantity}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Vehiculo</span><span className="text-slate-800">{dispatch.vehicle_plate || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Estado</span><span className="text-amber-700 text-xs font-medium bg-amber-50 px-2 py-0.5 rounded-full">EN CAMINO</span></div>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white
                             hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25
                             disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {confirming ? (
                    <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Confirmando...</span>
                  ) : (
                    'Confirmar Recepcion de Material'
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
