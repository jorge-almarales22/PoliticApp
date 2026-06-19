import { useState, useEffect, useRef, type FormEvent, type DragEvent } from 'react'
import {
  UserPlus, X, Loader2, AlertTriangle, CheckCircle2, Pencil, Trash2,
  Upload, Star, StarOff, Mail, Phone,
} from 'lucide-react'
import api from '../services/api'

interface Candidate {
  id: string
  campaign_id: string
  full_name: string
  email: string
  phone: string
  photo_url: string
  is_main: boolean
  created_at: string
  updated_at: string
}

interface CandidateForm {
  full_name: string
  email: string
  phone: string
  is_main: boolean
}

type AlertState = { type: 'success' | 'error'; message: string }

const UPLOAD_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/v1\/?$/, '')

const EMPTY_FORM: CandidateForm = { full_name: '', email: '', phone: '', is_main: false }

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10'

async function compressCandidatePhoto(file: File, maxDim = 500, quality = 0.65): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Contexto no disponible')); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Fallo al generar blob'))
        }, 'image/jpeg', quality)
      }
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Error al leer archivo'))
    reader.readAsDataURL(file)
  })
}

function fullUrl(path: string): string {
  if (!path) return ''
  return `${UPLOAD_BASE}${path}`
}

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [alert, setAlert] = useState<AlertState | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CandidateForm>(EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [compressing, setCompressing] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchCandidates = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await api.get<{ candidates: Candidate[] }>('/candidates')
      setCandidates(res.data.candidates ?? [])
    } catch {
      setFetchError('No se pudo cargar el listado de candidatos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCandidates() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setModalOpen(true)
  }

  const openEdit = (c: Candidate) => {
    setEditingId(c.id)
    setForm({ full_name: c.full_name ?? '', email: c.email ?? '', phone: c.phone ?? '', is_main: c.is_main ?? false })
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(c.photo_url ? fullUrl(c.photo_url) : null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setSubmitting(false)
    setCompressing(false)
  }

  const handleFieldChange = (field: keyof CandidateForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhotoSelect = (file: File | null) => {
    if (file) {
      setPhotoFile(file)
      const url = URL.createObjectURL(file)
      setPhotoPreview(url)
    } else {
      setPhotoFile(null)
      if (photoPreview && !photoPreview.startsWith('http')) URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('image/')) handlePhotoSelect(f)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAlert(null)

    let compressed: Blob | null = null
    if (photoFile) {
      setCompressing(true)
      try { compressed = await compressCandidatePhoto(photoFile) } catch {
        setAlert({ type: 'error', message: 'Error al comprimir la foto' }); setCompressing(false); return
      }
      setCompressing(false)
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('full_name', form.full_name.trim())
      fd.append('email', form.email.trim())
      fd.append('phone', form.phone.trim())
      fd.append('is_main', String(form.is_main))
      if (compressed) fd.append('photo', compressed, 'foto_candidato.jpg')

      if (editingId) {
        await api.put(`/candidates/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setAlert({ type: 'success', message: 'Candidato actualizado' })
      } else {
        await api.post('/candidates', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setAlert({ type: 'success', message: 'Candidato registrado' })
      }
      closeModal()
      await fetchCandidates()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error del servidor'
      setAlert({ type: 'error', message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/candidates/${deleteTarget.id}`)
      setAlert({ type: 'success', message: 'Candidato eliminado' })
      setDeleteTarget(null)
      await fetchCandidates()
    } catch { setAlert({ type: 'error', message: 'Error al eliminar' }) }
    finally { setDeleting(false) }
  }

  const canSubmit = form.full_name.trim() !== '' && !submitting && !compressing
  const busy = submitting || compressing

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Candidatos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Administra los candidatos de tu campana</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white
                     transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25
                     focus:outline-none focus:ring-4 focus:ring-indigo-500/30 active:scale-[0.98]"
        >
          <UserPlus size={18} /> Registrar Candidato
        </button>
      </div>

      {alert && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />}
          <p className="flex-1 text-sm font-medium text-slate-800">{alert.message}</p>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
      )}

      {fetchError && !loading && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 flex-1">{fetchError}</p>
          <button onClick={fetchCandidates} className="text-sm font-semibold text-red-600 underline">Reintentar</button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 flex justify-center">
          <Loader2 size={28} className="text-indigo-500 animate-spin" />
        </div>
      )}

      {!loading && !fetchError && candidates.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
            <UserPlus size={24} className="text-slate-300" />
          </div>
          <p className="text-slate-700 font-semibold">Sin candidatos registrados</p>
          <p className="text-sm text-slate-400 mt-1.5">Registra al candidato principal de tu campana</p>
        </div>
      )}

      {!loading && !fetchError && candidates.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-16"></th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Contacto</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Principal</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-[140px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    {c.photo_url ? (
                      <img src={fullUrl(c.photo_url)} alt={c.full_name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <UserPlus size={16} className="text-slate-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{c.full_name}</td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="space-y-1">
                      {c.email && <p className="text-xs text-slate-500 flex items-center gap-1"><Mail size={12} />{c.email}</p>}
                      {c.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={12} />{c.phone}</p>}
                      {!c.email && !c.phone && <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {c.is_main ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        <Star size={12} /> Principal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs text-slate-400">
                        <StarOff size={12} />
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600
                                   transition-all hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <Pencil size={14} /><span className="hidden sm:inline">Editar</span>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600
                                   transition-all hover:bg-red-50 hover:text-red-700 hover:border-red-200 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                      >
                        <Trash2 size={14} /><span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Editar Candidato' : 'Registrar Candidato'}</h2>
              <button onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre <span className="text-red-400">*</span></label>
                <input type="text" required value={form.full_name}
                  onChange={(e) => handleFieldChange('full_name', e.target.value)}
                  placeholder="Nombre del candidato" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={form.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="candidato@correo.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Celular</label>
                  <input type="text" value={form.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="3001234567" className={inputClass} />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_main}
                  onChange={(e) => handleFieldChange('is_main', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Es nuestro candidato principal</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Foto</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-indigo-400 bg-indigo-50/50' : photoPreview ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {photoPreview ? (
                    <div className="space-y-3">
                      <img src={photoPreview} alt="Preview" className="max-h-28 mx-auto rounded-xl border border-slate-200 shadow-sm" />
                      <div className="flex items-center justify-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 size={14} /> Foto cargada
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handlePhotoSelect(null) }}
                        className="text-xs text-slate-400 hover:text-red-500 underline">Quitar</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100"><Upload size={18} className="text-slate-400" /></div>
                      <p className="text-sm text-slate-500">Arrastra la foto o haz clic</p>
                      <p className="text-xs text-slate-400">Max 500x500px, JPEG optimizado</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { handlePhotoSelect(e.target.files?.[0] ?? null); e.target.value = '' }} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white
                             hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25 focus:outline-none focus:ring-4 focus:ring-indigo-500/30
                             disabled:opacity-40 disabled:hover:shadow-none active:scale-[0.98]">
                  {busy ? <><Loader2 size={16} className="animate-spin" /> {compressing ? 'Comprimiendo...' : 'Guardando...'}</> : editingId ? 'Guardar cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mb-4"><Trash2 size={24} className="text-red-600" /></div>
            <h3 className="text-lg font-semibold text-slate-800">Eliminar Candidato</h3>
            <p className="text-sm text-slate-500 mt-2">Estas seguro de eliminar a <strong>{deleteTarget.full_name}</strong>?</p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700
                           disabled:opacity-50 focus:ring-4 focus:ring-red-500/30">
                {deleting ? <><Loader2 size={16} className="animate-spin" /> Eliminando...</> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
