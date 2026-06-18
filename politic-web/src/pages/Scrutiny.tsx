import { useState, useEffect, useRef, type FormEvent, type DragEvent } from 'react'
import {
  Send, FileText, Upload, X, Loader2, AlertTriangle, CheckCircle2,
  Image as ImageIcon, MapPin, Table2, Vote, Camera,
} from 'lucide-react'
import api from '../services/api'

interface ScrutinyReport {
  id: string
  campaign_id: string
  witness_id: string
  voting_place: string
  table_number: number
  votes_candidate: number
  votes_rival_1: number
  votes_rival_2: number
  e14_image_url: string
  created_at: string
  updated_at: string
}

interface ScrutinyForm {
  voting_place: string
  table_number: string
  votes_candidate: string
  votes_rival_1: string
  votes_rival_2: string
}

type AlertState = { type: 'success' | 'error'; message: string }

const EMPTY_FORM: ScrutinyForm = {
  voting_place: '',
  table_number: '',
  votes_candidate: '',
  votes_rival_1: '',
  votes_rival_2: '',
}

const UPLOAD_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/v1\/?$/, '')

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10'

const numberInput =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 text-right font-mono ' +
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
        if (!ctx) { reject(new Error('No se pudo obtener el contexto del canvas')); return }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Fallo al generar el blob comprimido'))
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para comprimir'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)
  })
}

function fullImageUrl(relativePath: string): string {
  if (!relativePath) return ''
  return `${UPLOAD_BASE}${relativePath}`
}

export default function Scrutiny() {
  const [reports, setReports] = useState<ScrutinyReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [reportsError, setReportsError] = useState<string | null>(null)

  const [form, setForm] = useState<ScrutinyForm>(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [alert, setAlert] = useState<AlertState | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFieldChange = (field: keyof ScrutinyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (file: File | null) => {
    if (file) {
      setImageFile(file)
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    } else {
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileChange(file)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAlert(null)

    let compressedBlob: Blob | null = null
    if (imageFile) {
      setCompressing(true)
      try {
        compressedBlob = await compressImage(imageFile)
      } catch {
        setAlert({ type: 'error', message: 'Error al comprimir la imagen del acta' })
        setCompressing(false)
        return
      }
      setCompressing(false)
    }

    setSubmitting(true)

    try {
      const fd = new FormData()
      fd.append('voting_place', form.voting_place.trim())
      fd.append('table_number', form.table_number)
      fd.append('votes_candidate', form.votes_candidate || '0')
      fd.append('votes_rival_1', form.votes_rival_1 || '0')
      fd.append('votes_rival_2', form.votes_rival_2 || '0')

      if (compressedBlob) {
        fd.append('e14_image', compressedBlob, 'e14_comprimida.jpg')
      }

      await api.post('/scrutiny', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setAlert({ type: 'success', message: 'Acta E-14 enviada exitosamente' })
      setForm(EMPTY_FORM)
      handleFileChange(null)
      await fetchReports()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } }
        setAlert({ type: 'error', message: axiosErr.response?.data?.error ?? 'Error al enviar el reporte' })
      } else {
        setAlert({ type: 'error', message: 'Error de conexion con el servidor' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    form.voting_place.trim() !== '' &&
    form.table_number.trim() !== '' &&
    form.votes_candidate.trim() !== '' &&
    !submitting &&
    !compressing

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

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-50">
                <Vote size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Nueva Acta E-14</h2>
                <p className="text-xs text-slate-400">Completa los datos de la mesa</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Puesto de votacion <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.voting_place}
                    onChange={(e) => handleFieldChange('voting_place', e.target.value)}
                    placeholder="Ej: Colegio Nacional Loperena"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Mesa <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Table2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.table_number}
                    onChange={(e) => handleFieldChange('table_number', e.target.value)}
                    placeholder="1"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Votos Candidato <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.votes_candidate}
                    onChange={(e) => handleFieldChange('votes_candidate', e.target.value)}
                    placeholder="0"
                    className={numberInput}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Votos Blanco
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.votes_rival_1}
                    onChange={(e) => handleFieldChange('votes_rival_1', e.target.value)}
                    placeholder="0"
                    className={numberInput}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Votos Nulos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.votes_rival_2}
                    onChange={(e) => handleFieldChange('votes_rival_2', e.target.value)}
                    placeholder="0"
                    className={numberInput}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Foto del Acta E-14
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                    dragOver
                      ? 'border-indigo-400 bg-indigo-50/50'
                      : imagePreview
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img
                        src={imagePreview}
                        alt="Vista previa del acta"
                        className="max-h-32 mx-auto rounded-xl border border-slate-200 shadow-sm"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 size={14} />
                        <span>Imagen cargada</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleFileChange(null) }}
                        className="text-xs text-slate-400 hover:text-red-500 underline transition-colors"
                      >
                        Quitar imagen
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100">
                        <Camera size={18} className="text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">
                        Arrastra la foto o haz clic aqui
                      </p>
                      <p className="text-xs text-slate-400">JPEG o PNG, max 1200px tras compresion</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      handleFileChange(file)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white
                           transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25
                           focus:outline-none focus:ring-4 focus:ring-indigo-500/30 active:scale-[0.98]
                           disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none disabled:active:scale-100"
              >
                {busy ? (
                  <><Loader2 size={16} className="animate-spin" /> {compressing ? 'Comprimiendo imagen...' : 'Enviando acta...'}</>
                ) : (
                  <><Send size={16} /> Enviar Acta E-14</>
                )}
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
              <span className="text-xs text-slate-400">
                {reportsLoading ? '...' : `${reports.length} de ${reports.length}`}
              </span>
            </div>

            {reportsError && !reportsLoading && (
              <div className="p-10 flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle size={28} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">{reportsError}</p>
                  <button onClick={fetchReports} className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {reportsLoading && (
              <div className="p-16 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={24} className="text-indigo-400 animate-spin" />
                  <p className="text-sm text-slate-400">Cargando actas...</p>
                </div>
              </div>
            )}

            {!reportsLoading && !reportsError && reports.length === 0 && (
              <div className="p-16 flex items-center justify-center">
                <div className="text-center max-w-xs">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                    <FileText size={24} className="text-slate-300" />
                  </div>
                  <p className="text-slate-700 font-semibold">Sin actas registradas</p>
                  <p className="text-sm text-slate-400 mt-1.5">
                    Los testigos aun no han enviado reportes de escrutinio. Usa el formulario de la izquierda para registrar la primera acta.
                  </p>
                </div>
              </div>
            )}

            {!reportsLoading && !reportsError && reports.length > 0 && (
              <div className="divide-y divide-slate-50">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors duration-150"
                  >
                    {report.e14_image_url ? (
                      <button
                        onClick={() => setLightboxImage(fullImageUrl(report.e14_image_url))}
                        className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden shrink-0
                                   transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <img
                          src={fullImageUrl(report.e14_image_url)}
                          alt={`Acta mesa ${report.table_number}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <ImageIcon size={18} className="text-slate-300" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{report.voting_place}</p>
                        <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 font-mono">
                          Mesa {report.table_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-xs text-slate-500">
                          <strong className="text-slate-700 font-semibold">{report.votes_candidate}</strong> Candidato
                        </span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-500">
                          <strong className="text-slate-600">{report.votes_rival_1}</strong> Blanco
                        </span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-500">
                          <strong className="text-slate-600">{report.votes_rival_2}</strong> Nulos
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(report.created_at).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm"
             onClick={() => setLightboxImage(null)}>
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={22} />
          </button>
          <img
            src={lightboxImage}
            alt="Acta E-14 ampliada"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
