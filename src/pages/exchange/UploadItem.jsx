import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  Leaf,
  Loader2,
  Package,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { analyzeItemAi } from '../../lib/aiMock'
import { campusApi, USE_API } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'

const fallbackCategories = [
  'Buku',
  'Elektronik',
  'Perlengkapan Kos',
  'Alat Praktikum',
  'Pakaian',
  'Organisasi',
  'Aksesori',
  'Lainnya',
]

const steps = [
  { label: 'Unggah', hint: 'Pilih foto barang' },
  { label: 'Analisis', hint: 'AI mengisi detail' },
  { label: 'Tinjau', hint: 'Cek & edit data' },
  { label: 'Publikasi', hint: 'Tayangkan ke kampus' },
]

const listingTypeLabel = {
  sell: 'Jual',
  exchange: 'Tukar',
  borrow: 'Pinjam',
  donate: 'Donasi',
}

const VALID_TYPES = ['sell', 'exchange', 'borrow', 'donate']

const photoTips = [
  'Barang terlihat jelas',
  'Pencahayaan cukup',
  'Latar sederhana',
]

const examplePhotos = [
  {
    src: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=240&q=80',
    alt: 'Contoh kalkulator',
  },
  {
    src: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=240&q=80',
    alt: 'Contoh buku',
  },
  {
    src: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=240&q=80',
    alt: 'Contoh perlengkapan',
  },
]

const aiWillDetect = [
  { icon: Package, label: 'Kategori' },
  { icon: Star, label: 'Kondisi' },
  { icon: Sparkles, label: 'Estimasi harga' },
  { icon: FileText, label: 'Deskripsi' },
  { icon: Leaf, label: 'Dampak lingkungan' },
]

const ANALYSIS_CHECKS = [
  'Mengenali objek…',
  'Mengklasifikasi kategori…',
  'Mengestimasi harga…',
  'Membuat deskripsi…',
]

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

function AiResultPanel({ aiMeta, title }) {
  if (!aiMeta) return null
  const tip = aiMeta.tip || aiMeta.summary
  const score = Number(aiMeta.conditionScore || 0)
  const hasPrice = Number(aiMeta.suggestedPrice || 0) > 0
  const priceMin = Number(aiMeta.priceMin || 0)
  const priceMax = Number(aiMeta.priceMax || 0)

  return (
    <div className="surface border-[var(--leaf)]/30 bg-[var(--mint)]/50 p-5">
      <div className="flex items-center gap-2 text-[var(--forest-deep)]">
        <CheckCircle2 size={18} />
        <p className="font-semibold">{title}</p>
      </div>

      <ul className="mt-3 grid gap-1.5 text-sm text-[var(--forest-deep)] sm:grid-cols-2">
        {['Foto berhasil diproses', 'Objek terdeteksi', 'Kondisi dianalisis', 'Harga diperkirakan'].map(
          (label) => (
            <li key={label} className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              {label}
            </li>
          ),
        )}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-[#eef3f0] p-3">
          <p className="text-xs text-[var(--muted)]">Kategori</p>
          <p className="mt-1 font-semibold">{aiMeta.category}</p>
        </div>
        <div className="rounded-2xl bg-[#eef3f0] p-3">
          <p className="text-xs text-[var(--muted)]">Kondisi</p>
          <p className="mt-1 font-semibold">{aiMeta.condition}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Skor AI {score ? score.toFixed(1) : '—'} / 10
          </p>
        </div>
        <div className="rounded-2xl bg-[#eef3f0] p-3">
          <p className="text-xs text-[var(--muted)]">Kepercayaan AI</p>
          <p className="mt-1 font-semibold">{aiMeta.confidence}%</p>
        </div>
        <div className="rounded-2xl bg-[#eef3f0] p-3">
          <p className="text-xs text-[var(--muted)]">Direkomendasikan</p>
          <p className="mt-1 font-semibold">
            {listingTypeLabel[aiMeta.listingType] || aiMeta.listingType}
          </p>
        </div>
      </div>

      {hasPrice && (
        <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white p-3">
          <p className="text-xs text-[var(--muted)]">Estimasi harga AI</p>
          <p className="mt-1 font-semibold text-[var(--ink)]">
            {formatRp(priceMin)} – {formatRp(priceMax)}
          </p>
          <p className="mt-1 text-sm text-[var(--forest)]">
            Rekomendasi pasang {formatRp(aiMeta.suggestedPrice)}
          </p>
        </div>
      )}

      {Array.isArray(aiMeta.reasons) && aiMeta.reasons.length > 0 && (
        <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white p-3">
          <p className="text-sm font-semibold text-[var(--ink)]">Mengapa AI memilih hasil ini?</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
            {aiMeta.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--forest)]" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tip && (
        <p className="mt-3 rounded-xl border border-[var(--leaf)]/30 bg-[#eef3f0] p-3 text-sm leading-relaxed text-[var(--muted)]">
          <strong className="text-[var(--forest-deep)]">Tips AI:</strong> {tip}
        </p>
      )}
    </div>
  )
}

export default function UploadItem() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const typeFromUrl = searchParams.get('type')
  const lockedType = VALID_TYPES.includes(typeFromUrl) ? typeFromUrl : null
  const initialType = lockedType || 'sell'
  const { publishItem } = useData()
  const [step, setStep] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisTick, setAnalysisTick] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [aiMeta, setAiMeta] = useState(null)
  const [preview, setPreview] = useState('')
  const [fileName, setFileName] = useState('')
  const [categories, setCategories] = useState(fallbackCategories)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Buku',
    condition: 'Baik',
    listingType: initialType,
    location: '',
    price: '',
    lookingFor: '',
    imageFile: null,
  })

  useEffect(() => {
    let cancelled = false
    campusApi
      .categories()
      .then((list) => {
        if (cancelled || !Array.isArray(list) || list.length === 0) return
        setCategories(list)
        setForm((prev) => ({
          ...prev,
          category: list.includes(prev.category) ? prev.category : list[0],
        }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (lockedType) {
      setForm((prev) =>
        prev.listingType === lockedType ? prev : { ...prev, listingType: lockedType },
      )
    }
  }, [lockedType])

  const backTo = '/app/posting'

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function clearPhoto() {
    setPreview('')
    setFileName('')
    setAiMeta(null)
    setStep(0)
    setForm((prev) => ({ ...prev, imageFile: null }))
  }

  function acceptFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Maksimal 3MB')
      return
    }
    setForm((prev) => ({ ...prev, imageFile: file }))
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(String(reader.result))
      setFileName(file.name)
      setStep(0)
      toast.success('Foto siap dianalisis')
    }
    reader.readAsDataURL(file)
  }

  function onFileChange(e) {
    acceptFile(e.target.files?.[0])
    e.target.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    acceptFile(e.dataTransfer.files?.[0])
  }

  async function runAi() {
    if (!preview) {
      toast.error('Upload foto dulu')
      return
    }
    setAnalyzing(true)
    setAnalysisTick(0)
    setStep(1)
    try {
      for (let i = 0; i < ANALYSIS_CHECKS.length; i += 1) {
        setAnalysisTick(i)
        await new Promise((resolve) => setTimeout(resolve, 420))
      }
      setAnalysisTick(ANALYSIS_CHECKS.length)

      const result = USE_API
        ? await campusApi.analyzeItem({
            title: form.title,
            description: form.description,
            file_name: fileName,
          })
        : analyzeItemAi({
            title: form.title,
            description: form.description,
            fileName,
          })

      setForm((prev) => {
        const nextType = lockedType
          ? lockedType
          : result.listingType === 'exchange'
            ? 'exchange'
            : result.listingType || prev.listingType
        const nextCategory = categories.includes(result.category)
          ? result.category
          : prev.category || result.category || 'Lainnya'
        return {
          ...prev,
          title: prev.title || result.title,
          category: nextCategory,
          condition: result.condition,
          listingType: nextType,
          description: prev.description || result.summary || result.tip,
          price:
            prev.price ||
            (result.suggestedPrice && (nextType === 'sell' || !result.listingType)
              ? String(result.suggestedPrice)
              : prev.price),
          lookingFor: prev.lookingFor || result.lookingFor || '',
        }
      })
      setAiMeta({
        ...result,
        category: categories.includes(result.category) ? result.category : result.category,
      })
      toast.success(`AI selesai · kepercayaan ${result.confidence}%`)
    } catch {
      toast.error('Analisis AI gagal. Kamu bisa lanjut isi manual.')
      setAiMeta(null)
    } finally {
      setAnalyzing(false)
    }
  }

  function skipAi() {
    if (!preview) {
      toast.error('Upload foto dulu')
      return
    }
    setAiMeta(null)
    setStep(2)
  }

  function goConfirm() {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      toast.error('Lengkapi judul, deskripsi, dan lokasi dulu')
      return
    }
    if (form.listingType === 'sell' && !form.price) {
      toast.error('Isi harga untuk listing jual')
      return
    }
    if (form.listingType === 'exchange' && !form.lookingFor.trim()) {
      toast.error('Isi yang dicari untuk listing tukar')
      return
    }
    setStep(3)
  }

  async function handlePublish() {
    if (!preview) {
      toast.error('Upload foto dulu')
      return
    }
    setPublishing(true)
    try {
      const item = await publishItem({
        ...form,
        price: form.listingType === 'sell' ? form.price : 0,
        lookingFor: form.listingType === 'exchange' ? form.lookingFor : null,
        image: preview,
        imageFile: form.imageFile,
        tags: aiMeta?.tags || [],
      })
      toast.success(
        form.listingType === 'borrow'
          ? `"${item.title}" tayang di Pinjam.`
          : form.listingType === 'donate'
            ? `"${item.title}" sudah tayang di Donasi.`
            : form.listingType === 'sell'
              ? `"${item.title}" sudah tayang.`
              : `"${item.title}" sudah tayang.`,
      )
      navigate(
        form.listingType === 'borrow'
          ? '/app/exchange?type=borrow&mine=1'
          : form.listingType === 'donate'
            ? '/app/exchange?type=donate&mine=1'
            : form.listingType === 'sell'
              ? '/app/exchange?type=sell&mine=1'
              : `/app/exchange/${item.dbId || item.id}`,
      )
    } catch (err) {
      setStep(2)
      toast.error(err.response?.data?.message || 'Gagal memublikasikan')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={backTo}
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--forest)]"
      >
        <ArrowLeft size={16} />
        Kembali
      </Link>

      <PageHeader
        title={
          form.listingType === 'borrow'
            ? 'Posting pinjam'
            : form.listingType === 'donate'
              ? 'Posting donasi'
              : form.listingType === 'exchange'
                ? 'Posting tukar'
                : form.listingType === 'sell'
                  ? 'Posting jual'
                  : 'Posting barang'
        }
        description="Foto, isi detail dengan bantuan AI, lalu publikasikan."
      />

      <div className="mt-6 grid gap-2 sm:grid-cols-4">
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={`rounded-2xl px-3 py-2.5 text-center ${
              i === step
                ? 'bg-[var(--forest)] text-white'
                : i < step
                  ? 'bg-[var(--mint)] text-[var(--forest-deep)]'
                  : 'bg-slate-100 text-[var(--muted)]'
            }`}
          >
            <p className="text-xs font-semibold">
              {i + 1}. {s.label}
            </p>
            <p className={`mt-0.5 text-[10px] ${i === step ? 'text-white/75' : 'opacity-80'}`}>
              {s.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>
            Langkah {step + 1} dari 4 —{' '}
            <strong className="text-[var(--ink)]">{steps[step].label}</strong>
            : {steps[step].hint}
          </span>
          <span className="font-semibold text-[var(--forest)]">{(step + 1) * 25}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#e8efe9]">
          <div
            className="h-full rounded-full bg-[var(--forest)] transition-all duration-300"
            style={{ width: `${(step + 1) * 25}%` }}
          />
        </div>
      </div>

      {/* STEP 0: Unggah */}
      {step === 0 && (
        <div className="mt-6 space-y-4">
          <div className="surface-soft p-4">
            {preview ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                  <img
                    src={preview}
                    alt="Pratinjau"
                    className="mx-auto max-h-72 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 shadow"
                    aria-label="Hapus foto"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="text-center">
                  <p className="font-display text-lg font-semibold text-[var(--ink)]">
                    Foto siap dianalisis
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    AI akan mendeteksi kategori, kondisi, estimasi harga, dan membuat deskripsi
                    otomatis.
                  </p>
                  {fileName ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">{fileName}</p>
                  ) : null}
                </div>
                <label className="mx-auto block w-full max-w-xs">
                  <span className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--mint)]/40">
                    <Camera size={16} />
                    Ganti foto
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                </label>
              </div>
            ) : (
              <label
                className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--line)] bg-white px-4 py-12 text-center transition hover:border-[var(--leaf)] hover:bg-[var(--mint)]/35"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={onDrop}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mint)] text-[var(--forest)]">
                  <Camera size={26} />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-[var(--ink)]">
                    Tarik foto ke sini
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">atau</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white">
                  <Upload size={16} />
                  Pilih foto
                </span>
                <p className="text-xs text-[var(--muted)]">JPG · PNG · Maks. 3 MB</p>
                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </label>
            )}
          </div>

          {!preview && (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--ink)]">Contoh foto yang baik</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {photoTips.map((tip) => (
                  <li key={tip} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0 text-[var(--forest)]" />
                    {tip}
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {examplePhotos.map((photo) => (
                  <img
                    key={photo.src}
                    src={photo.src}
                    alt={photo.alt}
                    className="aspect-square rounded-xl object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--forest)]" />
              <p className="text-sm font-semibold text-[var(--forest-deep)]">AI akan menganalisis</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {aiWillDetect.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-center"
                >
                  <Icon size={14} className="mx-auto text-[var(--forest)]" />
                  <p className="mt-1 text-[11px] font-semibold text-[var(--ink)]">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {preview
                ? 'Foto sudah siap. Hasil analisis akan muncul pada langkah berikutnya.'
                : 'AI belum menganalisis foto ini. Hasil akan muncul pada langkah berikutnya.'}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Belum ada yang dipublikasikan di tahap ini.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="w-full sm:flex-1"
              disabled={!preview}
              onClick={runAi}
            >
              <Sparkles size={16} />
              Lanjut: Analisis AI
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="w-full sm:flex-1"
              disabled={!preview}
              onClick={skipAi}
            >
              Isi manual tanpa AI
            </Button>
          </div>
        </div>
      )}

      {/* STEP 1: Analisis */}
      {step === 1 && (
        <div className="mt-6 space-y-4">
          {analyzing ? (
            <div className="surface-soft space-y-5 px-5 py-10">
              <div className="text-center">
                <Sparkles className="mx-auto animate-pulse text-[var(--forest)]" size={36} />
                <p className="mt-3 font-display text-xl font-semibold text-[var(--ink)]">
                  AI sedang menganalisis foto…
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Mengenali objek, kategori, kondisi, dan estimasi harga.
                </p>
              </div>
              {preview && (
                <img
                  src={preview}
                  alt=""
                  className="mx-auto max-h-36 rounded-xl object-contain opacity-90"
                />
              )}
              <ul className="mx-auto max-w-sm space-y-2">
                {ANALYSIS_CHECKS.map((label, i) => {
                  const done = analysisTick > i
                  const active = analysisTick === i
                  return (
                    <li
                      key={label}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        done
                          ? 'border-[var(--leaf)]/40 bg-white text-[var(--forest-deep)]'
                          : active
                            ? 'border-[var(--forest)] bg-white text-[var(--ink)]'
                            : 'border-[var(--line)] bg-[#eef3f0] text-[var(--muted)]'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 size={16} className="shrink-0 text-[var(--forest)]" />
                      ) : active ? (
                        <Loader2 size={16} className="shrink-0 animate-spin text-[var(--forest)]" />
                      ) : (
                        <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-[var(--line)]" />
                      )}
                      {label}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <>
              {preview && (
                <div className="surface-soft p-3">
                  <img
                    src={preview}
                    alt="Pratinjau"
                    className="mx-auto max-h-40 rounded-xl object-contain"
                  />
                </div>
              )}

              {aiMeta ? (
                <AiResultPanel
                  aiMeta={aiMeta}
                  title="Analisis selesai — cek hasil AI di bawah"
                />
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Analisis tidak berhasil. Kamu tetap bisa lanjut mengisi detail secara manual.
                </div>
              )}

              <div className="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
                Ini masih langkah 2. Listing belum tayang. Klik lanjut untuk mengedit detail di
                langkah Tinjau.
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setStep(0)}
                >
                  Kembali
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={runAi}
                >
                  <Sparkles size={16} />
                  Analisis ulang
                </Button>
                <Button type="button" size="lg" className="w-full flex-1" onClick={() => setStep(2)}>
                  Lanjut: Tinjau & edit
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Tinjau */}
      {step === 2 && (
        <div className="mt-6 space-y-4">
          {preview && (
            <div className="surface-soft p-3">
              <img src={preview} alt="Pratinjau" className="mx-auto max-h-40 rounded-xl object-contain" />
            </div>
          )}

          {aiMeta && (
            <AiResultPanel aiMeta={aiMeta} title="Hasil AI — silakan tinjau & ubah jika perlu" />
          )}

          <Field
            label="Judul"
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />
          <Field
            as="textarea"
            label="Deskripsi"
            required
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              as="select"
              label="Kategori"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Field>
            <Field
              as="select"
              label="Jenis listing"
              value={form.listingType}
              disabled={Boolean(lockedType)}
              onChange={(e) => update('listingType', e.target.value)}
            >
              <option value="sell">Jual</option>
              <option value="exchange">Tukar</option>
              <option value="borrow">Pinjam</option>
              <option value="donate">Donasi</option>
            </Field>
            {lockedType && (
              <p className="sm:col-span-2 -mt-2 text-xs text-[var(--muted)]">
                {lockedType === 'borrow'
                  ? 'Ini posting pinjam.'
                  : lockedType === 'donate'
                    ? 'Ini posting donasi barang.'
                    : `Tipe: ${listingTypeLabel[lockedType]}`}
              </p>
            )}
            <Field
              as="select"
              label="Kondisi"
              value={form.condition}
              onChange={(e) => update('condition', e.target.value)}
            >
              <option>Sangat Baik</option>
              <option>Baik</option>
              <option>Cukup</option>
            </Field>
            <Field
              label="Lokasi kampus"
              required
              value={form.location}
              placeholder="Fakultas Teknik"
              onChange={(e) => update('location', e.target.value)}
            />
          </div>

          {form.listingType === 'sell' && (
            <Field
              label="Harga"
              type="number"
              min="1"
              required
              value={form.price}
              placeholder="50000"
              onChange={(e) => update('price', e.target.value)}
            />
          )}

          {form.listingType === 'exchange' && (
            <Field
              as="select"
              label="Dicari"
              required
              value={form.lookingFor}
              onChange={(e) => update('lookingFor', e.target.value)}
            >
              <option value="">Pilih kategori yang dicari</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Field>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Belum tayang. Klik lanjut untuk melihat ringkasan, lalu publikasikan di langkah berikutnya.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setStep(0)}>
              Kembali
            </Button>
            <Button type="button" size="lg" className="w-full flex-1" onClick={goConfirm}>
              Lanjut: Ringkasan publikasi
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Konfirmasi publikasi */}
      {step === 3 && (
        <div className="mt-6 space-y-4">
          <div className="surface border-[var(--forest)]/20 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--forest)]">
              Ringkasan — siap dipublikasikan?
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              {preview && (
                <img
                  src={preview}
                  alt=""
                  className="h-36 w-full rounded-xl object-cover sm:w-36"
                />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-display text-2xl font-semibold text-[var(--ink)]">{form.title}</p>
                <p className="line-clamp-3 text-sm text-[var(--muted)]">{form.description}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[var(--mint)] px-2.5 py-1 font-semibold text-[var(--forest)]">
                    {listingTypeLabel[form.listingType]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{form.category}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{form.condition}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{form.location}</span>
                </div>
                <p className="pt-1 text-lg font-semibold text-[var(--forest)]">
                  {form.listingType === 'sell'
                    ? `Rp ${Number(form.price || 0).toLocaleString('id-ID')}`
                    : form.listingType === 'exchange'
                      ? `Tukar · ${form.lookingFor}`
                      : form.listingType === 'donate'
                        ? 'Gratis'
                        : 'Pinjam'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
            Setelah kamu klik publikasikan, listing langsung terlihat oleh mahasiswa lain di kampus.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={publishing}
              onClick={() => setStep(2)}
            >
              Kembali edit
            </Button>
            <Button
              type="button"
              size="lg"
              className="w-full flex-1"
              disabled={publishing}
              onClick={handlePublish}
            >
              {publishing ? 'Memublikasikan…' : 'Ya, publikasikan sekarang'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
