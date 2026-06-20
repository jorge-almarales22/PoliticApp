import { useState, useEffect, useRef, type FormEvent } from 'react'
import {
  Truck, Package, QrCode, UserSquare2, Send, Plus, X, Loader2,
  AlertTriangle, CheckCircle2, Pencil, FileText, Image as ImageIcon,
  Search,
} from 'lucide-react'
import QRCode from 'qrcode'
import api from '../services/api'

interface Driver {
  id: string; full_name: string; dni: string; address: string; blood_type: string; license_pdf_url: string; created_at: string
}
interface Vehicle {
  id: string; campaign_id: string; plate: string; model: string; driver_id: string; driver_name: string; driver_phone: string
  status: string; image_url: string; soat_pdf_url: string; tecnomecanica_pdf_url: string; created_at: string
}
interface InventoryItem {
  id: string; campaign_id: string; item_name: string; item_type: string; total_qty: number; allocated_qty: number
  image_url: string; created_at: string
}
interface DispatchDetail {
  id: string; campaign_id: string; inventory_id: string; item_name: string; quantity: number
  receiver_id: string; receiver_name: string; vehicle_plate: string; qr_code_token: string; status: string; created_at: string
}
interface User {
  id: string; full_name: string; email: string; role: string
}

type Tab = 'inventory' | 'drivers' | 'vehicles' | 'dispatch'
type AlertState = { type: 'success' | 'error'; message: string }

const UPLOAD_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/v1\/?$/, '')

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: 'inventory', label: 'Inventario', icon: Package },
  { key: 'drivers', label: 'Conductores', icon: UserSquare2 },
  { key: 'vehicles', label: 'Vehiculos', icon: Truck },
  { key: 'dispatch', label: 'Despachos', icon: QrCode },
]

const VEHICLE_STATUS: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'EN RUTA': 'bg-amber-50 text-amber-700 border-amber-200',
  MANTENIMIENTO: 'bg-red-50 text-red-700 border-red-200',
}

const DISPATCH_STATUS: Record<string, string> = {
  EN_CAMINO: 'bg-amber-50 text-amber-700 border-amber-200',
  ENTREGADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDIENTE: 'bg-slate-50 text-slate-600 border-slate-200',
}

const ITEM_TYPE_LABEL: Record<string, string> = { ALIMENTO: 'Alimento', PUBLICIDAD: 'Publicidad', TRANSPORTE: 'Transporte' }

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10'

function fullUrl(path: string): string { return path ? `${UPLOAD_BASE}${path}` : '' }

export default function Logistics() {
  const [tab, setTab] = useState<Tab>('inventory')
  const [alert, setAlert] = useState<AlertState | null>(null)

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invLoading, setInvLoading] = useState(true)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [drvLoading, setDrvLoading] = useState(true)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehLoading, setVehLoading] = useState(true)
  const [dispatches, setDispatches] = useState<DispatchDetail[]>([])
  const [dispLoading, setDispLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const [invModal, setInvModal] = useState(false); const [invName, setInvName] = useState(''); const [invType, setInvType] = useState('PUBLICIDAD'); const [invQty, setInvQty] = useState(''); const [invImg, setInvImg] = useState<File | null>(null); const [invImgPrev, setInvImgPrev] = useState<string | null>(null); const [invSub, setInvSub] = useState(false)

  const [drvModal, setDrvModal] = useState(false); const [drvName, setDrvName] = useState(''); const [drvDni, setDrvDni] = useState(''); const [drvAddr, setDrvAddr] = useState(''); const [drvBlood, setDrvBlood] = useState(''); const [drvPdf, setDrvPdf] = useState<File | null>(null); const [drvSub, setDrvSub] = useState(false)

  const [vehModal, setVehModal] = useState(false); const [vehPlate, setVehPlate] = useState(''); const [vehModel, setVehModel] = useState(''); const [vehDrvId, setVehDrvId] = useState(''); const [vehImg, setVehImg] = useState<File | null>(null); const [vehSoat, setVehSoat] = useState<File | null>(null); const [vehTecno, setVehTecno] = useState<File | null>(null); const [vehSub, setVehSub] = useState(false)

  const [dispInvId, setDispInvId] = useState(''); const [dispRcvId, setDispRcvId] = useState(''); const [dispVehId, setDispVehId] = useState(''); const [dispQty, setDispQty] = useState(''); const [dispSub, setDispSub] = useState(false)

  const [qrToken, setQrToken] = useState<string | null>(null); const [qrUrl, setQrUrl] = useState<string | null>(null)

  const invImgRef = useRef<HTMLInputElement>(null)
  const vehImgRef = useRef<HTMLInputElement>(null)
  const vehSoatRef = useRef<HTMLInputElement>(null)
  const vehTecnoRef = useRef<HTMLInputElement>(null)
  const drvPdfRef = useRef<HTMLInputElement>(null)

  const fetchAll = async () => {
    try { const r = await api.get<{ inventory_items: InventoryItem[] }>('/logistics/inventory'); setInventory(r.data.inventory_items ?? []) } catch { /* */ } finally { setInvLoading(false) }
    try { const r = await api.get<{ drivers: Driver[] }>('/logistics/drivers'); setDrivers(r.data.drivers ?? []) } catch { /* */ } finally { setDrvLoading(false) }
    try { const r = await api.get<{ vehicles: Vehicle[] }>('/logistics/vehicles'); setVehicles(r.data.vehicles ?? []) } catch { /* */ } finally { setVehLoading(false) }
    try { const r = await api.get<{ dispatches: DispatchDetail[] }>('/logistics/dispatch'); setDispatches(r.data.dispatches ?? []) } catch { /* */ } finally { setDispLoading(false) }
    try { const r = await api.get<{ users: User[] }>('/users'); setUsers(r.data.users ?? []) } catch { /* */ }
  }

  useEffect(() => { fetchAll() }, [])

  const filteredUsers = users.filter((u) =>
    !userSearch || u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const handleCreateInventory = async (e: FormEvent) => {
    e.preventDefault(); setInvSub(true)
    try {
      const fd = new FormData(); fd.append('item_name', invName.trim()); fd.append('item_type', invType); fd.append('total_qty', invQty)
      if (invImg) fd.append('image', invImg)
      await api.post('/logistics/inventory', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAlert({ type: 'success', message: 'Material registrado' }); setInvModal(false); setInvName(''); setInvType('PUBLICIDAD'); setInvQty(''); setInvImg(null); setInvImgPrev(null)
      await fetchAll()
    } catch (err: unknown) { setAlert({ type: 'error', message: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error' }) }
    finally { setInvSub(false) }
  }

  const handleCreateDriver = async (e: FormEvent) => {
    e.preventDefault(); setDrvSub(true)
    try {
      const fd = new FormData(); fd.append('full_name', drvName.trim()); fd.append('dni', drvDni.trim()); fd.append('address', drvAddr.trim()); fd.append('blood_type', drvBlood.trim())
      if (drvPdf) fd.append('license_pdf', drvPdf)
      await api.post('/logistics/drivers', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAlert({ type: 'success', message: 'Conductor registrado' }); setDrvModal(false); setDrvName(''); setDrvDni(''); setDrvAddr(''); setDrvBlood(''); setDrvPdf(null)
      await fetchAll()
    } catch (err: unknown) { setAlert({ type: 'error', message: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error' }) }
    finally { setDrvSub(false) }
  }

  const handleCreateVehicle = async (e: FormEvent) => {
    e.preventDefault(); setVehSub(true)
    try {
      const fd = new FormData(); fd.append('plate', vehPlate.trim()); fd.append('model', vehModel.trim()); fd.append('driver_id', vehDrvId)
      const drv = drivers.find((d) => d.id === vehDrvId)
      if (drv) { fd.append('driver_name', drv.full_name) }
      if (vehImg) fd.append('image', vehImg)
      if (vehSoat) fd.append('soat_pdf', vehSoat)
      if (vehTecno) fd.append('tecnomecanica_pdf', vehTecno)
      await api.post('/logistics/vehicles', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAlert({ type: 'success', message: 'Vehiculo registrado' }); setVehModal(false); setVehPlate(''); setVehModel(''); setVehDrvId(''); setVehImg(null); setVehSoat(null); setVehTecno(null)
      await fetchAll()
    } catch (err: unknown) { setAlert({ type: 'error', message: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error' }) }
    finally { setVehSub(false) }
  }

  const handleSubmitDispatch = async (e: FormEvent) => {
    e.preventDefault(); setDispSub(true)
    try {
      const res = await api.post<{ dispatch: { qr_code_token: string; id: string } }>('/logistics/dispatch', { inventory_id: dispInvId, receiver_id: dispRcvId, vehicle_id: dispVehId || undefined, quantity: parseInt(dispQty, 10) })
      const token = res.data.dispatch.qr_code_token
      const qrUrl = `http://192.168.40.39:5173/logistics/verify/${res.data.dispatch.id}`
      const dataUrl = await QRCode.toDataURL(qrUrl, { width: 240, margin: 2 })
      setQrToken(token); setQrUrl(dataUrl)
      setAlert({ type: 'success', message: 'Despacho creado' })
      setDispInvId(''); setDispRcvId(''); setDispVehId(''); setDispQty('')
      await fetchAll()
    } catch (err: unknown) { setAlert({ type: 'error', message: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error' }) }
    finally { setDispSub(false) }
  }

  const toggleVehicle = async (v: Vehicle) => {
    const next = v.status === 'DISPONIBLE' ? 'EN RUTA' : v.status === 'EN RUTA' ? 'MANTENIMIENTO' : 'DISPONIBLE'
    try { await api.patch(`/logistics/vehicles/${v.id}/status`, { status: next }); await fetchAll() }
    catch { setAlert({ type: 'error', message: 'Error al cambiar estado' }) }
  }

  const itemOptions = inventory.filter((i) => i.total_qty - i.allocated_qty > 0).map((i) => ({ value: i.id, label: `${i.item_name} (${i.total_qty - i.allocated_qty} disp.)` }))
  const drvOptions = drivers.map((d) => ({ value: d.id, label: `${d.full_name} - ${d.dni}` }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Logistica e Inventario</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestiona conductores, vehiculos, materiales y despachos</p>
      </div>

      {alert && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />}
          <p className="flex-1 text-sm font-medium text-slate-800">{alert.message}</p>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
      )}

      <div className="flex gap-0.5 sm:gap-1 bg-slate-100 rounded-2xl p-1 sm:p-1.5 w-fit max-w-full overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={16} /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Material de Campana</h2>
            <button onClick={() => { setInvImg(null); setInvImgPrev(null); setInvModal(true) }} className="btn-primary">
              <Plus size={16} /> Agregar
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
            {invLoading ? <div className="p-12 flex justify-center"><Loader2 size={24} className="text-indigo-400 animate-spin" /></div>
              : inventory.length === 0 ? <div className="p-12 text-center text-sm text-slate-400">Sin materiales.</div>
                : <table className="w-full text-left min-w-[500px]"><thead><tr className="border-b border-slate-100"><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase w-16"></th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">Material</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">Tipo</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase text-right">Total</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase text-right">Asignado</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase text-right">Disp.</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {inventory.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50/60">
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3">{i.image_url ? <img src={fullUrl(i.image_url)} className="w-8 h-8 rounded-lg object-cover border border-slate-200" alt="" /> : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Package size={14} className="text-slate-300" /></div>}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm font-medium text-slate-800">{i.item_name}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs text-slate-500">{ITEM_TYPE_LABEL[i.item_type] ?? i.item_type}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm text-slate-700 text-right font-mono">{i.total_qty}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm text-slate-500 text-right font-mono">{i.allocated_qty}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm text-slate-800 text-right font-mono font-semibold">{i.total_qty - i.allocated_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </div>
      )}

      {tab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Conductores</h2>
            <button onClick={() => { setDrvPdf(null); setDrvModal(true) }} className="btn-primary"><Plus size={16} /> Registrar</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
            {drvLoading ? <div className="p-12 flex justify-center"><Loader2 size={24} className="text-indigo-400 animate-spin" /></div>
              : drivers.length === 0 ? <div className="p-12 text-center text-sm text-slate-400">Sin conductores.</div>
                : <table className="w-full text-left min-w-[500px]"><thead><tr className="border-b border-slate-100"><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">Nombre</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">DNI</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase hidden md:table-cell">Direccion</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">Tipo Sangre</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">Licencia</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {drivers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/60">
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm font-medium text-slate-800">{d.full_name}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm text-slate-600 font-mono">{d.dni}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm text-slate-500 hidden md:table-cell">{d.address || '—'}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm text-slate-600">{d.blood_type || '—'}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-3">
                          {d.license_pdf_url ? (
                            <a href={fullUrl(d.license_pdf_url)} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all">
                              <FileText size={14} /> Ver PDF
                            </a>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </div>
      )}

      {tab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Flota de Vehiculos</h2>
            <button onClick={() => { setVehImg(null); setVehSoat(null); setVehTecno(null); setVehModal(true) }} className="btn-primary"><Plus size={16} /> Registrar</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
            {vehLoading ? <div className="p-12 flex justify-center"><Loader2 size={24} className="text-indigo-400 animate-spin" /></div>
              : vehicles.length === 0 ? <div className="p-12 text-center text-sm text-slate-400">Sin vehiculos.</div>
                : <table className="w-full text-left min-w-[500px]"><thead><tr className="border-b border-slate-100"><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">Placa</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase hidden md:table-cell">Conductor</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">Estado</th><th className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs font-semibold text-slate-400 uppercase">Documentos</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {vehicles.map((v) => {
                      const st = VEHICLE_STATUS[v.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/60">
                          <td className="px-3 sm:px-6 py-2.5 sm:py-3">
                            <div className="flex items-center gap-3">
                              {v.image_url ? <img src={fullUrl(v.image_url)} className="w-8 h-8 rounded-lg object-cover border border-slate-200" alt="" /> : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Truck size={14} className="text-slate-300" /></div>}
                              <div><p className="text-sm font-mono font-medium text-slate-800">{v.plate}</p><p className="text-xs text-slate-400">{v.model || '—'}</p></div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-sm text-slate-600 hidden md:table-cell">{v.driver_name || '—'}</td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-3">
                            <button onClick={() => toggleVehicle(v)} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium hover:opacity-80 transition-all ${st}`}>
                              <Pencil size={11} /> {v.status === 'DISPONIBLE' ? 'Disponible' : v.status === 'EN RUTA' ? 'En Ruta' : 'Mantenimiento'}
                            </button>
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-3">
                            <div className="flex items-center gap-1.5">
                              {v.soat_pdf_url && <a href={fullUrl(v.soat_pdf_url)} target="_blank" className="btn-doc" title="SOAT"><FileText size={14} /> SOAT</a>}
                              {v.tecnomecanica_pdf_url && <a href={fullUrl(v.tecnomecanica_pdf_url)} target="_blank" className="btn-doc" title="Tecnomecanica"><FileText size={14} /> TCM</a>}
                              {!v.soat_pdf_url && !v.tecnomecanica_pdf_url && <span className="text-xs text-slate-300">Sin docs</span>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>}
          </div>
        </div>
      )}

      {tab === 'dispatch' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleSubmitDispatch} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Nuevo Despacho</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Material<span className="text-red-400">*</span></label>
                <select value={dispInvId} onChange={(e) => setDispInvId(e.target.value)} required className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {itemOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Lider / Receptor<span className="text-red-400">*</span></label>
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={userSearch} onFocus={() => setShowUserDropdown(true)} onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                    onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true) }}
                    placeholder="Buscar por nombre..." className={`${inputClass} pl-10`} />
                </div>
                {showUserDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <button key={u.id} type="button" onClick={() => { setDispRcvId(u.id); setUserSearch(u.full_name); setShowUserDropdown(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors ${dispRcvId === u.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}>
                        {u.full_name} <span className="text-slate-400 text-xs ml-1">({u.role})</span>
                      </button>
                    ))}
                    {filteredUsers.length === 0 && <p className="px-4 py-2.5 text-sm text-slate-400">Sin resultados</p>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Vehiculo</label>
                <select value={dispVehId} onChange={(e) => setDispVehId(e.target.value)} className={inputClass}>
                  <option value="">Sin vehiculo asignado</option>
                  {vehicles.filter((v) => v.status === 'DISPONIBLE').map((v) => <option key={v.id} value={v.id}>{v.plate} - {v.driver_name || 'Sin conductor'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Cantidad<span className="text-red-400">*</span></label>
                <input type="number" min="1" required value={dispQty} onChange={(e) => setDispQty(e.target.value)} placeholder="Cantidad" className={inputClass} />
              </div>
              <button type="submit" disabled={!dispInvId || !dispRcvId || !dispQty || dispSub}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 hover:shadow-lg disabled:opacity-40 active:scale-[0.98] transition-all">
                {dispSub ? <><Loader2 size={16} className="animate-spin" /> Despachando...</> : <><Send size={16} /> Crear Despacho</>}
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Historial</h3></div>
              {dispLoading ? <div className="p-12 flex justify-center"><Loader2 size={24} className="text-indigo-400 animate-spin" /></div>
                : dispatches.length === 0 ? <div className="p-12 text-center text-sm text-slate-400">Sin despachos.</div>
                  : <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                    {dispatches.map((d) => {
                      const st = DISPATCH_STATUS[d.status] ?? 'bg-slate-50 text-slate-600'
                      return (
                        <div key={d.id} className="px-4 sm:px-6 py-3 flex items-center justify-between hover:bg-slate-50/60">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{d.item_name} <span className="text-slate-400">x{d.quantity}</span></p>
                            <p className="text-xs text-slate-400 mt-0.5">{d.receiver_name || d.receiver_id.slice(0, 8)} {d.vehicle_plate ? `· ${d.vehicle_plate}` : ''}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ml-3 ${st}`}>
                            {d.status === 'EN_CAMINO' ? 'En camino' : d.status === 'ENTREGADO' ? 'Entregado' : d.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>}
            </div>
          </div>
        </div>
      )}

      {invModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setInvModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between mb-5"><h3 className="text-base font-semibold text-slate-800">Agregar Material</h3><button onClick={() => setInvModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100"><X size={18} className="text-slate-400" /></button></div>
            <form onSubmit={handleCreateInventory} className="space-y-4">
              <input required placeholder="Nombre" value={invName} onChange={(e) => setInvName(e.target.value)} className={inputClass} />
              <select value={invType} onChange={(e) => setInvType(e.target.value)} className={inputClass}><option value="PUBLICIDAD">Publicidad</option><option value="ALIMENTO">Alimento</option><option value="TRANSPORTE">Transporte</option></select>
              <input type="number" min="1" required placeholder="Cantidad total" value={invQty} onChange={(e) => setInvQty(e.target.value)} className={inputClass} />
              <div className={`rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${invImgPrev ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                onClick={() => invImgRef.current?.click()}>
                {invImgPrev ? <div className="space-y-2"><img src={invImgPrev} className="max-h-20 mx-auto rounded-lg" alt="" /><p className="text-xs text-emerald-600">Imagen cargada</p></div>
                  : <div className="space-y-1"><ImageIcon size={20} className="text-slate-300 mx-auto" /><p className="text-xs text-slate-400">Foto del material</p></div>}
                <input ref={invImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setInvImg(f); setInvImgPrev(f ? URL.createObjectURL(f) : null); e.target.value = '' }} />
              </div>
              <button type="submit" disabled={!invName || !invQty || invSub}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-all">
                {invSub ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Registrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {drvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrvModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between mb-5"><h3 className="text-base font-semibold text-slate-800">Registrar Conductor</h3><button onClick={() => setDrvModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100"><X size={18} className="text-slate-400" /></button></div>
            <form onSubmit={handleCreateDriver} className="space-y-4">
              <input required placeholder="Nombre completo" value={drvName} onChange={(e) => setDrvName(e.target.value)} className={inputClass} />
              <input required placeholder="DNI" value={drvDni} onChange={(e) => setDrvDni(e.target.value)} className={inputClass} />
              <input placeholder="Direccion" value={drvAddr} onChange={(e) => setDrvAddr(e.target.value)} className={inputClass} />
              <input placeholder="Tipo de sangre" value={drvBlood} onChange={(e) => setDrvBlood(e.target.value)} className={inputClass} />
              <div className={`rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${drvPdf ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                onClick={() => drvPdfRef.current?.click()}>
                {drvPdf ? <p className="text-xs text-emerald-600">Licencia: {drvPdf.name}</p> : <div className="space-y-1"><FileText size={20} className="text-slate-300 mx-auto" /><p className="text-xs text-slate-400">Licencia (PDF)</p></div>}
                <input ref={drvPdfRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { setDrvPdf(e.target.files?.[0] ?? null); e.target.value = '' }} />
              </div>
              <button type="submit" disabled={!drvName || !drvDni || drvSub}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-all">
                {drvSub ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Registrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {vehModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setVehModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between mb-5"><h3 className="text-base font-semibold text-slate-800">Registrar Vehiculo</h3><button onClick={() => setVehModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100"><X size={18} className="text-slate-400" /></button></div>
            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <input required placeholder="Placa" value={vehPlate} onChange={(e) => setVehPlate(e.target.value)} className={inputClass} />
              <input placeholder="Modelo" value={vehModel} onChange={(e) => setVehModel(e.target.value)} className={inputClass} />
              <select value={vehDrvId} onChange={(e) => setVehDrvId(e.target.value)} className={inputClass}>
                <option value="">Seleccionar conductor...</option>
                {drvOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <div className={`rounded-xl border-2 border-dashed p-3 text-center cursor-pointer transition-all ${vehImg ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => vehImgRef.current?.click()}>
                  {vehImg ? <ImageIcon size={16} className="text-emerald-500 mx-auto" /> : <><ImageIcon size={16} className="text-slate-300 mx-auto" /><p className="text-[10px] text-slate-400 mt-1">Foto</p></>}
                  <input ref={vehImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setVehImg(e.target.files?.[0] ?? null); e.target.value = '' }} />
                </div>
                <div className={`rounded-xl border-2 border-dashed p-3 text-center cursor-pointer transition-all ${vehSoat ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => vehSoatRef.current?.click()}>
                  {vehSoat ? <FileText size={16} className="text-emerald-500 mx-auto" /> : <><FileText size={16} className="text-slate-300 mx-auto" /><p className="text-[10px] text-slate-400 mt-1">SOAT</p></>}
                  <input ref={vehSoatRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { setVehSoat(e.target.files?.[0] ?? null); e.target.value = '' }} />
                </div>
                <div className={`rounded-xl border-2 border-dashed p-3 text-center cursor-pointer transition-all ${vehTecno ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => vehTecnoRef.current?.click()}>
                  {vehTecno ? <FileText size={16} className="text-emerald-500 mx-auto" /> : <><FileText size={16} className="text-slate-300 mx-auto" /><p className="text-[10px] text-slate-400 mt-1">TCM</p></>}
                  <input ref={vehTecnoRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { setVehTecno(e.target.files?.[0] ?? null); e.target.value = '' }} />
                </div>
              </div>
              <button type="submit" disabled={!vehPlate || vehSub}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-all">
                {vehSub ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Registrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {qrToken && qrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setQrToken(null); setQrUrl(null) }} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Despacho Creado</h3>
            <p className="text-xs text-slate-400 mb-5">Escanea para verificar la entrega</p>
            <div className="bg-white inline-block p-3 rounded-2xl border border-slate-200 shadow-sm mb-4">
              <img src={qrUrl} alt="QR" className="w-48 h-48" />
            </div>
            <p className="text-[10px] font-mono text-slate-400 break-all mb-5">{qrToken}</p>
            <button onClick={() => window.print()} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-all mb-2">
              <Send size={15} className="inline mr-1" /> Imprimir Ticket
            </button>
            <button onClick={() => { setQrToken(null); setQrUrl(null) }} className="w-full text-sm text-slate-500 hover:text-slate-700 py-1.5">Finalizar</button>
          </div>
        </div>
      )}

      <style>{`
        .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; border-radius: 0.75rem; background: #4f46e5; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600; color: white; transition: all 0.2s; }
        .btn-primary:hover { background: #4338ca; box-shadow: 0 10px 15px -3px rgba(79,70,229,0.25); }
        .btn-primary:active { transform: scale(0.98); }
        .btn-doc { display: inline-flex; align-items: center; gap: 0.25rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: white; padding: 0.25rem 0.625rem; font-size: 0.75rem; font-weight: 500; color: #475569; transition: all 0.2s; }
        .btn-doc:hover { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
      `}</style>
    </div>
  )
}
