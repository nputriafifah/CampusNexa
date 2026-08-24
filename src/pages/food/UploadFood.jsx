import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Leaf,
  Loader2,
  Sparkles,
  Upload,
  Utensils,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { campusApi, USE_API } from '../../lib/api'
import { analyzeFoodAi } from '../../lib/aiMock'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'

const steps = [
  { label: 'Unggah', hint: 'Foto & jumlah' },
  { label: 'Analisis', hint: 'AI Food Rescue' },
  { label: 'Tinjau', hint: 'Cek & edit' },
  { label: 'Publikasi', hint: 'Tayangkan' },
]

const ANALYSIS_CHECKS = [
  'Mengenali jenis makanan…',
  'Mengestimasi porsi…',
  'Menghitung waktu aman…',
  'Menyusun deskripsi…',
]

function toLocalInput(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultPickupLocal(hours = 4) {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return toLocalInput(d)
}

function safetyTone(level) {
  if (level === 'urgent') return 'border-amber-200 bg-amber-50 text-amber-900'
  if (level === 'unsafe') return 'border-red-200 bg-red-50 text-red-800'
  return 'border-[var(--leaf)]/40 bg-[var(--mint)]/50 text-[var(--forest-deep)]'
}

function safetyDot(level) {
  if (level === 'urgent') return 'bg-amber-500'
  if (level === 'unsafe') return 'bg-red-500'
  return 'bg-[var(--forest)]'
}

export default function UploadFood() {
  const navigate = useNavigate()
  const { publishFood } = useData()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    title: '',
    description: '',
    quantity: '10',
    unit: 'porsi',
    location: '',
    pickupUntil: defaultPickupLocal(),
    maxClaimPerUser: '2',
    organization: '',
    fromEvent: false,
    eventName: '',
    eventOrg: '',
    imageFile: null,
  })
  const [preview, setPreview] = useState('')
  const [fileName, setFileName] = useState('')
  const [aiMeta, setAiMeta] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisTick, setAnalysisTick] = useState(0)
  const [publishing, setPublishing] = useState(false)

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
    update('imageFile', file)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  function onFileChange(e) {
    acceptFile(e.target.files?.[0])
    e.target.value = ''
  }

  function clearPhoto() {
    update('imageFile', null)
    setPreview('')
    setFileName('')
  }

  function organizerValue() {
    if (form.fromEvent) {
      return [form.eventOrg.trim(), form.eventName.trim()].filter(Boolean).join(' · ')
    }
    return form.organization.trim()
  }

  async function runAi() {
    if (!preview && !form.title.trim()) {
      toast.error('Upload foto atau isi judul singkat dulu')
      return
    }
    setAnalyzing(true)
    setAnalysisTick(0)
    setStep(1)
    try {
      for (let i = 0; i < ANALYSIS_CHECKS.length; i += 1) {
        setAnalysisTick(i)
        await new Promise((r) => setTimeout(r, 400))
      }
      setAnalysisTick(ANALYSIS_CHECKS.length)

      const result = USE_API
        ? await campusApi.predictFood({
            title: form.title || fileName,
            quantity: Number(form.quantity) || 10,
            file_name: fileName,
          })
        : analyzeFoodAi({
            title: form.title || fileName,
            quantity: form.quantity,
            fileName,
          })

      setAiMeta(result)
      setForm((prev) => ({
        ...prev,
        title: prev.title || result.title || prev.title,
        description: prev.description || result.description || prev.description,
        quantity: String(result.estimatedPortions || prev.quantity),
        unit: result.unit || prev.unit,
        maxClaimPerUser: String(result.maxClaimPerUser || prev.maxClaimPerUser),
        pickupUntil: defaultPickupLocal(result.safeHours || 3),
      }))
      toast.success(`AI selesai · kepercayaan ${result.confidence || 80}%`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analisis AI gagal')
      setAiMeta(null)
    } finally {
      setAnalyzing(false)
    }
  }

  function goReview() {
    if (!form.title.trim()) {
      toast.error('Judul masih kosong')
      return
    }
    setStep(2)
  }

  function goPublishStep() {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      toast.error('Lengkapi judul, deskripsi, dan lokasi')
      return
    }
    if (!form.pickupUntil) {
      toast.error('Isi batas pengambilan')
      return
    }
    setStep(3)
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const org = organizerValue()
      const food = await publishFood({
        ...form,
        organization: org,
        quantity: Number(form.quantity),
        maxClaimPerUser: Number(form.maxClaimPerUser),
        pickupUntil: new Date(form.pickupUntil).toISOString(),
        description: form.fromEvent && form.eventName
          ? `${form.description}\n\nFood Rescue dari ${[form.eventName, form.eventOrg].filter(Boolean).join(' · ')}.`
          : form.description,
      })
      if (!food) {
        toast.error('Gagal mempublikasikan — pastikan akun terhubung ke kampus')
        return
      }
      toast.success(`"${food.title}" sudah tayang`)
      navigate(`/app/food/${food.dbId || food.id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mempublikasikan')
      setStep(2)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/app/posting"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--forest)]"
      >
        <ArrowLeft size={16} />
        Kembali ke Posting
      </Link>

      <PageHeader
        title="Posting makanan"
        description="Food Rescue dengan bantuan AI — bagikan sisa sebelum basi."
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

      {step === 0 && (
        <div className="mt-6 space-y-4">
          <div className="surface-soft p-4">
            {preview ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                  <img src={preview} alt="Preview" className="mx-auto max-h-64 object-contain" />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 shadow"
                    aria-label="Hapus foto"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-center text-sm font-semibold text-[var(--ink)]">
                  Foto siap dianalisis
                </p>
              </div>
            ) : (
              <label
                className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--line)] bg-white px-4 py-12 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  acceptFile(e.dataTransfer.files?.[0])
                }}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efe0c4] text-[#7a4b0f]">
                  <Camera size={26} />
                </span>
                <p className="font-display text-lg font-semibold">Tarik foto makanan ke sini</p>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white">
                  <Upload size={16} />
                  Pilih foto
                </span>
                <p className="text-xs text-[var(--muted)]">JPG · PNG · Maks. 3 MB</p>
                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Perkiraan jumlah"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
            />
            <Field
              label="Judul singkat (opsional)"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Nasi box / roti / buah…"
            />
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-4 text-sm text-[var(--muted)]">
            AI akan mengenali jenis makanan, waktu aman, saran klaim, judul, dan deskripsi. Belum ada
            yang dipublikasikan di tahap ini.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="w-full sm:flex-1"
              disabled={!preview && !form.title.trim()}
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
              disabled={!preview && !form.title.trim()}
              onClick={() => setStep(2)}
            >
              Isi manual tanpa AI
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-4">
          {analyzing ? (
            <div className="surface-soft space-y-5 px-5 py-10">
              <div className="text-center">
                <Sparkles className="mx-auto animate-pulse text-[var(--forest)]" size={36} />
                <p className="mt-3 font-display text-xl font-semibold">AI sedang menganalisis…</p>
              </div>
              {preview && (
                <img src={preview} alt="" className="mx-auto max-h-36 rounded-xl object-contain" />
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
                            ? 'border-[var(--forest)] bg-white'
                            : 'border-[var(--line)] bg-[#eef3f0] text-[var(--muted)]'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 size={16} className="text-[var(--forest)]" />
                      ) : active ? (
                        <Loader2 size={16} className="animate-spin text-[var(--forest)]" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-[var(--line)]" />
                      )}
                      {label}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : aiMeta ? (
            <>
              <div className={`rounded-2xl border p-4 ${safetyTone(aiMeta.safetyLevel)}`}>
                <div className="flex items-center gap-2 font-semibold">
                  <span className={`h-2.5 w-2.5 rounded-full ${safetyDot(aiMeta.safetyLevel)}`} />
                  {aiMeta.safetyLabel}
                </div>
                <p className="mt-1 text-sm opacity-90">{aiMeta.safetyHint}</p>
              </div>

              <div className="surface border-[var(--leaf)]/30 bg-[var(--mint)]/50 p-5">
                <div className="flex items-center gap-2 text-[var(--forest-deep)]">
                  <Sparkles size={18} />
                  <p className="font-semibold">Hasil Analisis AI</p>
                </div>
                <ul className="mt-3 grid gap-1.5 text-sm text-[var(--forest-deep)] sm:grid-cols-2">
                  {(aiMeta.checks || []).map((c) => (
                    <li key={c} className="flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      {c}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-[var(--muted)]">Jenis makanan</p>
                    <p className="mt-1 font-semibold">{aiMeta.foodType}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-[var(--muted)]">Kategori</p>
                    <p className="mt-1 font-semibold">{aiMeta.foodCategory}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-[var(--muted)]">Estimasi porsi</p>
                    <p className="mt-1 font-semibold">
                      {aiMeta.estimatedPortions} {aiMeta.unit}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-[var(--muted)]">Aman dikonsumsi</p>
                    <p className="mt-1 font-semibold">{aiMeta.safeUntilLabel}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-[var(--muted)]">Rekomendasi batas klaim</p>
                    <p className="mt-1 font-semibold">{aiMeta.recommendPickupLabel} WIB</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-[var(--muted)]">Saran maks. klaim</p>
                    <p className="mt-1 font-semibold">
                      {aiMeta.maxClaimPerUser} {aiMeta.unit}/orang
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--forest-deep)]">
                    <Leaf size={16} />
                    Dampak jika seluruh makanan diklaim
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                    <li>≈ {aiMeta.estimatedPortions} {aiMeta.unit} terselamatkan</li>
                    <li>≈ {aiMeta.estimatedKg} kg limbah makanan dihindari</li>
                    <li>≈ {aiMeta.co2eKg} kg CO₂e dihemat</li>
                  </ul>
                </div>

                <p className="mt-3 rounded-xl bg-[#eef3f0] p-3 text-sm text-[var(--muted)]">
                  <strong className="text-[var(--forest-deep)]">Tips AI:</strong>{' '}
                  {aiMeta.tip || aiMeta.summary}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                  Kembali
                </Button>
                <Button type="button" variant="secondary" onClick={runAi}>
                  <Sparkles size={16} />
                  Analisis ulang
                </Button>
                <Button type="button" size="lg" className="flex-1" onClick={goReview}>
                  Lanjut: Tinjau & edit
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Analisis tidak berhasil. Kamu bisa lanjut isi manual.
              </div>
              <Button type="button" onClick={() => setStep(2)}>
                Isi manual
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4">
          {preview && (
            <div className="surface-soft p-3">
              <img src={preview} alt="Preview" className="mx-auto max-h-40 rounded-xl object-contain" />
            </div>
          )}

          {aiMeta && (
            <div className={`rounded-2xl border p-3 text-sm ${safetyTone(aiMeta.safetyLevel)}`}>
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${safetyDot(aiMeta.safetyLevel)}`} />
              {aiMeta.safetyLabel} · {aiMeta.safetyHint}
            </div>
          )}

          <Field
            label="Judul"
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Nasi Box Ayam Teriyaki"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Jumlah"
              type="number"
              min="1"
              required
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
            />
            <Field as="select" label="Satuan" value={form.unit} onChange={(e) => update('unit', e.target.value)}>
              <option value="porsi">Porsi</option>
              <option value="pcs">Pcs</option>
              <option value="kotak">Kotak</option>
              <option value="pack">Pack</option>
            </Field>
          </div>

          <Field
            label="Lokasi pengambilan"
            required
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="Lobby Gedung A"
          />

          <Field
            label="Batas pengambilan"
            type="datetime-local"
            required
            value={form.pickupUntil}
            onChange={(e) => update('pickupUntil', e.target.value)}
          />

          <Field
            label="Maks. klaim per orang"
            type="number"
            min="1"
            max="20"
            required
            value={form.maxClaimPerUser}
            onChange={(e) => update('maxClaimPerUser', e.target.value)}
          />

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.fromEvent}
              onChange={(e) => update('fromEvent', e.target.checked)}
            />
            <span>
              <span className="font-semibold text-[var(--ink)]">Ini berasal dari acara kampus</span>
              <span className="mt-0.5 block text-[var(--muted)]">
                Tampil sebagai Food Rescue dari acara / organisasi.
              </span>
            </span>
          </label>

          {form.fromEvent ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nama acara"
                value={form.eventName}
                onChange={(e) => update('eventName', e.target.value)}
                placeholder="Seminar AI"
              />
              <Field
                label="Organisasi"
                value={form.eventOrg}
                onChange={(e) => update('eventOrg', e.target.value)}
                placeholder="HIMA TI"
              />
            </div>
          ) : (
            <Field
              label="Penyelenggara (opsional)"
              value={form.organization}
              onChange={(e) => update('organization', e.target.value)}
              placeholder="BEM FT / HIMA TI / Kantin Teknik"
            />
          )}

          <Field
            as="textarea"
            label="Deskripsi"
            required
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => setStep(aiMeta ? 1 : 0)}>
              Kembali
            </Button>
            <Button type="button" size="lg" className="flex-1" onClick={goPublishStep}>
              Lanjut: Publikasi
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center gap-2 text-[var(--forest)]">
              <Utensils size={18} />
              <p className="font-semibold">Siap dipublikasikan</p>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold">{form.title}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {form.quantity} {form.unit} · {form.location}
            </p>
            {organizerValue() && (
              <p className="mt-2 text-sm text-[var(--forest)]">
                Food Rescue dari {organizerValue()}
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{form.description}</p>
          </div>

          {aiMeta && (
            <div className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-4 text-sm text-[var(--muted)]">
              <p className="font-semibold text-[var(--forest-deep)]">Dampak potensial</p>
              <p className="mt-1">
                ≈ {aiMeta.estimatedKg} kg limbah dihindari · ≈ {aiMeta.co2eKg} kg CO₂e
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              Kembali edit
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1"
              disabled={publishing}
              onClick={handlePublish}
            >
              {publishing ? 'Mempublikasikan…' : 'Publikasikan Food Rescue'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
