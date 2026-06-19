import { useState, useEffect, useRef, type FormEvent, type DragEvent } from 'react'
import {
  Send, FileText, X, Loader2, AlertTriangle, CheckCircle2,
  Image as ImageIcon, MapPin, Table2, Vote, Camera, UserPlus,
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

interface CandidateVote {
  candidate_id: string
  votes: number
}

interface ScrutinyReport {
  id: string
  campaign_id: string
  witness_id: string
  voting_place: string
  table_number: number
  zone: string
  votos_blanco: number
  votos_nulos: number
  candidate_votes: CandidateVote[]
  e14_image_url: string
  created_at: string
  updated_at: string
}

type AlertState = { type: 'success' | 'error'; message: string }

const UPLOAD_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/v1\/?$/, '')

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10'

const numberInput =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 text-right font-mono ' +
  'transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10'

async function compressImage(file: File, maxDim = 1200, quality = 0.7): Promise<Blob> {
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

function fullImageUrl(relativePath: string): string {
  if (!relativePath) return ''
  return `${UPLOAD_BASE}${relativePath}`
}

export default function Scrutiny() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)

  const [reports, setReports] = useState<ScrutinyReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [reportsError, setReportsError] = useState<string | null>(null)

  const [votingPlace, setVotingPlace] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [zone, setZone] = useState('')
  const [votosBlanco, setVotosBlanco] = useState('')
  const [votosNulos, setVotosNulos] = useState('')
  const [candidateVotes, setCandidateVotes] = useState<Record<string, string>>({})

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [alert, setAlert] = useState<AlertState | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchCandidates = async () => {
    setCandidatesLoading(true)
    try {
      const res = await api.get<{ candidates: Candidate[] }>('/candidates')
      const list = res.data.candidates ?? []
      setCandidates(list)
      setCandidateVotes((prev) => {
        const next = { ...prev }
        for (const c of list) {
          if (!(c.id in next)) next[c.id] = ''
        }
        return next
      })
    } catch { /* silently fail, candidates will be empty */ }
    finally { setCandidatesLoading(false) }
  }

  const fetchReports = async () => {
    setReportsLoading(true)
    setReportsError(null)
    try {
      const res = await api.get<{ reports: ScrutinyReport[] }>('/scrutiny')
      setReports(res.data.reports ?? [])
    } catch {
      setReportsError('No se pudo cargar el listado de reportes')
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => { fetchCandidates(); fetchReports() }, [])

  const handleCandidateVoteChange = (candidateId: string, value: string) => {
    setCandidateVotes((prev) => ({ ...prev, [candidateId]: value }))
  }

  const handleFileChange = (file: File | null) => {
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    } else {
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('image/')) handleFileChange(f)
  }

  const resetForm = () => {
    setVotingPlace('')
    setTableNumber('')
    setZone('')
    setVotosBlanco('')
    setVotosNulos('')
    const reset: Record<string, string> = {}
    for (const c of candidates) reset[c.id] = ''
    setCandidateVotes(reset)
    handleFileChange(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAlert(null)

    let compressedBlob: Blob | null = null
    if (imageFile) {
      setCompressing(true)
      try { compressedBlob = await compressImage(imageFile) } catch {
        setAlert({ type: 'error', message: 'Error al comprimir la imagen' }); setCompressing(false); return
      }
      setCompressing(false)
    }

    const votes: CandidateVote[] = []
    for (const c of candidates) {
      const v = parseInt(candidateVotes[c.id] || '0', 10)
      if (v > 0) votes.push({ candidate_id: c.id, votes: v })
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('voting_place', votingPlace.trim())
      fd.append('table_number', tableNumber)
      fd.append('zone', zone.trim())
      fd.append('votos_blanco', votosBlanco || '0')
      fd.append('votos_nulos', votosNulos || '0')
      fd.append('candidate_votes', JSON.stringify(votes))
      if (compressedBlob) fd.append('e14_image', compressedBlob, 'e14_comprimida.jpg')

      await api.post('/scrutiny', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

      setAlert({ type: 'success', message: 'Acta E-14 enviada exitosamente' })
      resetForm()
      await fetchReports()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error del servidor'
      setAlert({ type: 'error', message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const hasMesaData = votingPlace.trim() !== '' && tableNumber.trim() !== ''
  const canSubmit = hasMesaData && !submitting && !compressing
  const busy = submitting || compressing

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Escrutinio y Testigos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registra actas E-14 desde cada mesa de votacion</p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-3 py-1 font-medium">
          {reports.length} acta{reports.length !== 1 ? 's' : ''}
        </span>
      </div>

      {alert && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />}
          <p className="flex-1 text-sm font-medium text-slate-800">{alert.message}</p>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-50"><Vote size={20} className="text-indigo-600" /></div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Nueva Acta E-14</h2>
                <p className="text-xs text-slate-400">Completa los datos de la mesa</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Zona</label>
                  <input type="text" value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="Ej: Zona Norte" className={inputBase} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Mesa <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="1" required value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="1" className={`${inputBase}`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Puesto de votacion <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={votingPlace}
                    onChange={(e) => setVotingPlace(e.target.value)}
                    placeholder="Colegio Nacional Loperena" className={`${inputBase} pl-10`} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Votos por Candidato</p>
                {candidatesLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Cargando candidatos...</div>
                )}
                {!candidatesLoading && candidates.length === 0 && (
                  <p className="text-sm text-slate-400">No hay candidatos registrados.</p>
                )}
                {!candidatesLoading && candidates.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    {c.photo_url ? (
                      <img src={fullImageUrl(c.photo_url)} alt={c.full_name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                        <UserPlus size={14} className="text-slate-400" />
                      </div>
                    )}
                    <span className="flex-1 text-sm text-slate-700 truncate">{c.full_name}</span>
                    <input
                      type="number" min="0" value={candidateVotes[c.id] || ''}
                      onChange={(e) => handleCandidateVoteChange(c.id, e.target.value)}
                      placeholder="0"
                      className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 text-right font-mono
                                 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Votos Blanco</label>
                  <input type="number" min="0" value={votosBlanco}
                    onChange={(e) => setVotosBlanco(e.target.value)}
                    placeholder="0" className={numberInput} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Votos Nulos</label>
                  <input type="number" min="0" value={votosNulos}
                    onChange={(e) => setVotosNulos(e.target.value)}
                    placeholder="0" className={numberInput} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Foto del Acta E-14</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-indigo-400 bg-indigo-50/50' : imagePreview ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded-xl border border-slate-200 shadow-sm" />
                      <p className="text-xs text-emerald-700 flex items-center justify-center gap-1"><CheckCircle2 size={14} /> Imagen cargada</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleFileChange(null) }}
                        className="text-xs text-slate-400 hover:text-red-500 underline">Quitar</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100"><Camera size={18} className="text-slate-400" /></div>
                      <p className="text-sm text-slate-500 font-medium">Arrastra la foto o haz clic</p>
                      <p className="text-xs text-slate-400">Max 1200px tras compresion</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { handleFileChange(e.target.files?.[0] ?? null); e.target.value = '' }} />
                </div>
              </div>

              <button type="submit" disabled={!canSubmit}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white
                           hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25 focus:ring-4 focus:ring-indigo-500/30
                           disabled:opacity-40 disabled:hover:shadow-none active:scale-[0.98]">
                {busy ? <><Loader2 size={16} className="animate-spin" /> {compressing ? 'Comprimiendo...' : 'Enviando acta...'}</> : <><Send size={16} /> Enviar Acta E-14</>}
              </button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">Actas Registradas</h2>
              </div>
              <span className="text-xs text-slate-400">{reportsLoading ? '...' : reports.length}</span>
            </div>

            {reportsError && !reportsLoading && (
              <div className="p-10 text-center">
                <AlertTriangle size={28} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">{reportsError}</p>
                <button onClick={fetchReports} className="mt-2 text-sm font-medium text-indigo-600">Reintentar</button>
              </div>
            )}

            {reportsLoading && (
              <div className="p-16 flex justify-center"><Loader2 size={24} className="text-indigo-400 animate-spin" /></div>
            )}

            {!reportsLoading && !reportsError && reports.length === 0 && (
              <div className="p-16 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4"><FileText size={24} className="text-slate-300" /></div>
                <p className="text-slate-700 font-semibold">Sin actas registradas</p>
                <p className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">Usa el formulario para registrar la primera acta.</p>
              </div>
            )}

            {!reportsLoading && !reportsError && reports.length > 0 && (
              <div className="divide-y divide-slate-50">
                {reports.map((report) => {
                  const cv = report.candidate_votes ?? []
                  return (
                    <div key={report.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
                      {report.e14_image_url ? (
                        <button onClick={() => setLightboxImage(fullImageUrl(report.e14_image_url))}
                          className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden shrink-0 hover:border-indigo-300 hover:shadow-md transition-all">
                          <img src={fullImageUrl(report.e14_image_url)} alt={`Mesa ${report.table_number}`} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><ImageIcon size={18} className="text-slate-300" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-800">{report.voting_place}</p>
                          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Mesa {report.table_number}</span>
                          {report.zone && <span className="text-xs text-slate-400">{report.zone}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          {cv.map((entry) => {
                            const cand = candidates.find((c) => c.id === entry.candidate_id)
                            return (
                              <span key={entry.candidate_id} className="text-xs text-slate-500">
                                <strong className="text-slate-700">{entry.votes}</strong> {cand?.full_name ?? 'Candidato'}
                              </span>
                            )
                          })}
                          <span className="text-xs text-slate-400">|</span>
                          <span className="text-xs text-slate-500"><strong className="text-slate-600">{report.votos_blanco}</strong> Blanco</span>
                          <span className="text-xs text-slate-400">|</span>
                          <span className="text-xs text-slate-500"><strong className="text-slate-600">{report.votos_nulos}</strong> Nulos</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(report.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"><X size={22} /></button>
          <img src={lightboxImage} alt="E-14" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
