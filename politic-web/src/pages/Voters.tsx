import { useState, useEffect, type FormEvent } from 'react'
import {
  UserPlus, X, MapPin, Loader2, Pencil, Trash2,
  AlertTriangle, CheckCircle2, Search,
} from 'lucide-react'
import api from '../services/api'

interface Voter {
  id: string
  full_name: string
  dni: string
  address: string
  phone: string
  email: string
  latitude: number
  longitude: number
  campaign_id: string
  tags: string[]
  created_at: string
  updated_at: string
}

interface VoterForm {
  full_name: string
  dni: string
  address: string
  phone: string
  email: string
}

type GpsStatus = 'idle' | 'loading' | 'success' | 'error'

interface AlertState {
  type: 'success' | 'error'
  message: string
}

interface Coords {
  latitude: number
  longitude: number
}

const ACCENT_MAP: Record<string, string> = {
  '\u00e1': '&aacute;',
  '\u00e9': '&eacute;',
  '\u00ed': '&iacute;',
  '\u00f3': '&oacute;',
  '\u00fa': '&uacute;',
  '\u00c1': '&Aacute;',
  '\u00c9': '&Eacute;',
  '\u00cd': '&Iacute;',
  '\u00d3': '&Oacute;',
  '\u00da': '&Uacute;',
  '\u00f1': '&ntilde;',
  '\u00d1': '&Ntilde;',
  '\u00fc': '&uuml;',
  '\u00dc': '&Uuml;',
}

function sanitizeText(text: string): string {
  return text.replace(/[\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1\u00fc\u00dc]/g, (char) => ACCENT_MAP[char] || char)
}

const EMPTY_FORM: VoterForm = { full_name: '', dni: '', address: '', phone: '', email: '' }

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10'

export default function Voters() {
  const [voters, setVoters] = useState<Voter[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [alert, setAlert] = useState<AlertState | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VoterForm>(EMPTY_FORM)
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle')
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Voter | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchVoters = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await api.get<{ voters: Voter[] }>('/voters')
      setVoters(res.data.voters ?? [])
    } catch {
      setFetchError('No se pudo cargar el listado de votantes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVoters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreateModal = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setGpsStatus('idle')
    setGpsError(null)
    setCoords(null)
    setModalOpen(true)
  }

  const openEditModal = (voter: Voter) => {
    setEditingId(voter.id)
    setForm({
      full_name: voter.full_name ?? '',
      dni: voter.dni ?? '',
      address: voter.address ?? '',
      phone: voter.phone ?? '',
      email: voter.email ?? '',
    })
    setCoords({ latitude: voter.latitude, longitude: voter.longitude })
    setGpsStatus('success')
    setGpsError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setGpsStatus('idle')
    setGpsError(null)
    setCoords(null)
    setSubmitting(false)
  }

  const handleFieldChange = (field: keyof VoterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error')
      setGpsError('Tu navegador no soporta geolocalizacion')
      return
    }

    setGpsStatus('loading')
    setGpsError(null)
    setCoords(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setGpsStatus('success')
      },
      (err) => {
        setGpsStatus('error')
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('Permiso denegado. Activa la ubicacion en tu navegador')
            break
          case err.POSITION_UNAVAILABLE:
            setGpsError('No se pudo determinar tu ubicacion')
            break
          case err.TIMEOUT:
            setGpsError('Tiempo agotado. Intenta de nuevo')
            break
          default:
            setGpsError('Error al obtener la ubicacion')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!coords) return

    setSubmitting(true)
    setAlert(null)

    const payload = {
      full_name: sanitizeText((form.full_name ?? '').trim()),
      dni: sanitizeText((form.dni ?? '').trim()),
      address: sanitizeText((form.address ?? '').trim()),
      phone: sanitizeText((form.phone ?? '').trim()),
      email: sanitizeText((form.email ?? '').trim()),
      latitude: coords.latitude,
      longitude: coords.longitude,
      tags: [] as string[],
    }

    try {
      if (editingId) {
        await api.put(`/voters/${editingId}`, payload)
        setAlert({ type: 'success', message: 'Votante actualizado exitosamente' })
      } else {
        await api.post('/voters', payload)
        setAlert({ type: 'success', message: 'Votante registrado exitosamente' })
      }
      closeModal()
      await fetchVoters()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } }
        setAlert({ type: 'error', message: axiosErr.response?.data?.error ?? 'Error del servidor' })
      } else {
        setAlert({ type: 'error', message: 'Error de conexion con el servidor' })
      }
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/voters/${deleteTarget.id}`)
      setAlert({ type: 'success', message: 'Votante eliminado exitosamente' })
      setDeleteTarget(null)
      await fetchVoters()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } }
        setAlert({ type: 'error', message: axiosErr.response?.data?.error ?? 'Error al eliminar' })
      } else {
        setAlert({ type: 'error', message: 'Error de conexion con el servidor' })
      }
    } finally {
      setDeleting(false)
    }
  }

  const canSubmit = coords !== null && form.full_name.trim() !== '' && form.dni.trim() !== '' && !submitting
  const isEditing = editingId !== null

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Gestion de Votantes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{voters.length} votantes registrados en tu campana</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white
                     transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25
                     focus:outline-none focus:ring-4 focus:ring-indigo-500/30 active:scale-[0.98]"
        >
          <UserPlus size={18} />
          Registrar Votante
        </button>
      </div>

      {alert && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            alert.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
          }`}
        >
          {alert.type === 'success'
            ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            : <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />}
          <p className={`flex-1 text-sm font-medium ${alert.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
            {alert.message}
          </p>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {fetchError && !loading && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{fetchError}</p>
          </div>
          <button onClick={fetchVoters} className="text-sm font-semibold text-red-600 hover:text-red-800 underline">Reintentar</button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400">Cargando votantes...</p>
          </div>
        </div>
      )}

      {!loading && !fetchError && voters.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
              <Search size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-700 font-semibold">Sin votantes registrados</p>
            <p className="text-sm text-slate-400 mt-1.5">Registra tu primer votante para comenzar a mapear tu territorio</p>
          </div>
        </div>
      )}

      {!loading && !fetchError && voters.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">DNI</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Direccion</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Telefono</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-[140px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {voters.map((voter) => (
                  <tr key={voter.id} className="group hover:bg-slate-50/60 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{voter.full_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">{voter.dni}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 hidden md:table-cell">{voter.address || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 hidden lg:table-cell">{voter.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(voter)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600
                                     transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200
                                     focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                        >
                          <Pencil size={14} />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(voter)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600
                                     transition-all duration-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200
                                     focus:outline-none focus:ring-4 focus:ring-red-500/10"
                        >
                          <Trash2 size={14} />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {isEditing ? 'Editar Votante' : 'Registrar Votante'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEditing ? 'Modifica los datos del votante' : 'Completa el formulario para registrar un nuevo votante'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-600 mb-1.5">
                  Nombre Completo <span className="text-red-400">*</span>
                </label>
                <input id="full_name" type="text" required value={form.full_name}
                  onChange={(e) => handleFieldChange('full_name', e.target.value)}
                  placeholder="Maria Jose Rodriguez" className={inputClass} />
              </div>

              <div>
                <label htmlFor="dni" className="block text-sm font-medium text-slate-600 mb-1.5">
                  DNI <span className="text-red-400">*</span>
                </label>
                <input id="dni" type="text" required value={form.dni}
                  onChange={(e) => handleFieldChange('dni', e.target.value)}
                  placeholder="12345678" className={inputClass} />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-600 mb-1.5">Direccion</label>
                <input id="address" type="text" value={form.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="Calle 15 # 8-45" className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-600 mb-1.5">Telefono</label>
                  <input id="phone" type="text" value={form.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="3001234567" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
                  <input id="email" type="email" value={form.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="maria@correo.com" className={inputClass} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3">
                <p className="text-sm font-medium text-slate-600">Ubicacion GPS <span className="text-red-400">*</span></p>

                {gpsStatus === 'success' && coords && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-800 font-mono">
                    {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                  </div>
                )}

                {gpsStatus === 'error' && gpsError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">{gpsError}</div>
                )}

                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={gpsStatus === 'loading'}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600
                             transition-all duration-200 hover:bg-slate-50 hover:border-slate-300
                             focus:outline-none focus:ring-4 focus:ring-indigo-500/10
                             disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {gpsStatus === 'loading' ? (
                    <><Loader2 size={16} className="animate-spin" /> Capturando ubicacion...</>
                  ) : gpsStatus === 'success' ? (
                    <><MapPin size={16} className="text-emerald-500" /> Recapturar ubicacion</>
                  ) : (
                    <><MapPin size={16} /> Capturar mi ubicacion</>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600
                             transition-all hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/10">
                  Cancelar
                </button>
                <button type="submit" disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white
                             transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25
                             focus:outline-none focus:ring-4 focus:ring-indigo-500/30
                             disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none">
                  {submitting ? (
                    <><Loader2 size={16} className="animate-spin" /> {isEditing ? 'Actualizando...' : 'Guardando...'}</>
                  ) : isEditing ? (
                    'Guardar cambios'
                  ) : (
                    'Registrar votante'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Eliminar Votante</h3>
              <p className="text-sm text-slate-500 mt-2">
                Estas seguro de eliminar a <strong className="text-slate-700">{deleteTarget.full_name}</strong>?
                Esta accion no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600
                           transition-all hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white
                           transition-all duration-200 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25
                           focus:outline-none focus:ring-4 focus:ring-red-500/30
                           disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <><Loader2 size={16} className="animate-spin" /> Eliminando...</>
                ) : (
                  <>Eliminar definitivamente</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
