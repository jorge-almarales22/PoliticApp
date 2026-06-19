import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { CheckCircle2, Loader2, AlertTriangle, Truck, Package, MapPin } from 'lucide-react'

const MOBILE_API = axios.create({
  baseURL: 'http://192.168.40.39:8080/api/v1',
})

MOBILE_API.interceptors.request.use((config) => {
  const token = localStorage.getItem('politic_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface DispatchInfo {
  id: string
  item_name: string
  quantity: number
  receiver_name: string
  vehicle_plate: string
  driver_name: string
  status: string
}

type ViewState = 'loading' | 'error' | 'pending' | 'confirmed'

export default function VerifyDispatch() {
  const { id } = useParams<{ id: string }>()

  const [view, setView] = useState<ViewState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [dispatch, setDispatch] = useState<DispatchInfo | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!id) {
      setError('ID de despacho no encontrado en la URL')
      setView('error')
      return
    }

    async function fetchDispatch() {
      try {
        const res = await MOBILE_API.get<{ dispatch: DispatchInfo }>(`/logistics/dispatch/${id}`)
        const d = res.data.dispatch
        setDispatch(d)
        setView(d.status === 'ENTREGADO' ? 'confirmed' : 'pending')
      } catch {
        setError('Despacho no encontrado. Verifica el codigo QR.')
        setView('error')
      }
    }
    fetchDispatch()
  }, [id])

  const handleConfirm = async () => {
    if (!id) return
    setConfirming(true)
    try {
      await MOBILE_API.post(`/logistics/dispatch/${id}/receive`)
      setView('confirmed')
    } catch {
      setError('Error al confirmar. Intenta de nuevo.')
      setView('error')
    } finally {
      setConfirming(false)
    }
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Loader2 size={32} className="text-indigo-500 animate-spin" />
          </div>
          <p className="text-slate-700 font-semibold text-lg">Verificando despacho...</p>
          <p className="text-sm text-slate-400 mt-1">Escaneando codigo QR</p>
        </div>
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-red-100 w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Codigo Invalido</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  if (view === 'confirmed' && dispatch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 w-full max-w-sm p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Material verificado y recibido en bodega con exito!</h2>
          <p className="text-slate-500 mb-5">Recepcion confirmada exitosamente</p>
          <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Package size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Material</p>
                <p className="text-sm font-semibold text-slate-800">{dispatch.item_name} <span className="text-slate-400 font-normal">x{dispatch.quantity}</span></p>
              </div>
            </div>
            {dispatch.vehicle_plate && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Truck size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Vehiculo</p>
                  <p className="text-sm font-semibold text-slate-800">{dispatch.vehicle_plate}</p>
                </div>
              </div>
            )}
            {dispatch.driver_name && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Conductor</p>
                  <p className="text-sm font-semibold text-slate-800">{dispatch.driver_name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-indigo-100 flex items-center justify-center">
            <Package size={36} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Confirmar Recepcion</h2>
          <p className="text-sm text-slate-500 mt-1">Revisa el contenido antes de confirmar</p>
        </div>

        {dispatch && (
          <div className="bg-slate-50 rounded-2xl p-5 space-y-4 mb-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Material</span>
              <span className="text-sm font-semibold text-slate-800">{dispatch.item_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Cantidad</span>
              <span className="text-lg font-bold font-mono text-slate-800">{dispatch.quantity}</span>
            </div>
            {dispatch.vehicle_plate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Vehiculo</span>
                <span className="text-sm font-semibold text-slate-800">{dispatch.vehicle_plate}</span>
              </div>
            )}
            {dispatch.driver_name && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Conductor</span>
                <span className="text-sm text-slate-700">{dispatch.driver_name}</span>
              </div>
            )}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm text-slate-500">Estado</span>
              <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-0.5">
                EN CAMINO
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white
                     hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25
                     disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {confirming ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Confirmando...
            </span>
          ) : (
            'Confirmar Recepcion de Material'
          )}
        </button>
      </div>
    </div>
  )
}
