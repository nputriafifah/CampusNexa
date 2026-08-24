import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Badge, statusLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { computeFreshness, computePriority, estimateFoodImpact } from '../../lib/foodInsights'

const STATUS_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'available', label: 'Tersedia' },
  { id: 'claimed', label: 'Diklaim penuh' },
  { id: 'expired', label: 'Kedaluwarsa' },
]

const emptyFood = {
  title: '',
  description: '',
  quantity: '10',
  unit: 'porsi',
  location: '',
  pickup_until: '',
  organization_id: '',
  max_claim_per_user: '2',
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatPickup(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function hoursLeftLabel(iso) {
  if (!iso) return null
  const hours = (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60)
  if (hours <= 0) return 'Sudah lewat batas'
  if (hours < 1) return `Berakhir dalam ${Math.max(1, Math.round(hours * 60))} menit`
  if (hours < 24) return `Berakhir dalam ${Math.round(hours)} jam`
  return `Berakhir dalam ${Math.round(hours / 24)} hari`
}

function foodSortScore(food) {
  const statusRank = { available: 0, claimed: 1, expired: 2 }
  const until = food.pickupUntil ? new Date(food.pickupUntil).getTime() : Number.POSITIVE_INFINITY
  const hoursLeft = (until - Date.now()) / (1000 * 60 * 60)
  const priority = computePriority(food)
  const urgentBoost = priority.urgent ? -1000 : 0
  return (statusRank[food.status] ?? 9) * 1e9 + urgentBoost + hoursLeft
}

function foodStatusLabel(food) {
  if (food.status === 'claimed' || (food.status === 'available' && Number(food.remaining) === 0)) {
    return 'Diklaim penuh'
  }
  return statusLabel(food.status)
}

export default function CampusFoods() {
  const [foods, setFoods] = useState([])
  const [orgs, setOrgs] = useState([])
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyFood)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      campusApi.adminFoods({
        q: debouncedQ || undefined,
        status: status === 'all' ? undefined : status,
      }),
      campusApi.adminOrganizations(),
    ])
      .then(([foodRows, orgRows]) => {
        setFoods(foodRows)
        setOrgs(orgRows)
      })
      .catch(() => toast.error('Gagal memuat makanan'))
      .finally(() => setLoading(false))
  }, [debouncedQ, status])

  useEffect(() => {
    load()
  }, [load])

  const sortedFoods = useMemo(
    () => [...foods].sort((a, b) => foodSortScore(a) - foodSortScore(b)),
    [foods],
  )

  function resetForm() {
    setForm(emptyFood)
    setEditingId(null)
    setImageFile(null)
    setImagePreview('')
  }

  function startCreate() {
    resetForm()
    setForm({
      ...emptyFood,
      organization_id: orgs[0] ? String(orgs[0].id) : '',
    })
    setShowForm(true)
  }

  function startEdit(food) {
    const match = orgs.find((o) => o.name === food.organization)
    setEditingId(food.dbId || food.id)
    setImageFile(null)
    setImagePreview(food.image || '')
    setForm({
      title: food.title || '',
      description: food.description || '',
      quantity: String(food.quantity || 1),
      unit: food.unit || 'porsi',
      location: food.location || '',
      pickup_until: toLocalInput(food.pickupUntil),
      organization_id: match ? String(match.id) : '',
      max_claim_per_user: String(food.maxClaimPerUser || 2),
    })
    setShowForm(true)
  }

  function onImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.organization_id) {
      toast.error('Pilih penyelenggara')
      return
    }
    setSaving(true)
    const fields = {
      title: form.title,
      description: form.description || null,
      quantity: Number(form.quantity) || 1,
      unit: form.unit || 'porsi',
      location: form.location,
      pickup_until: new Date(form.pickup_until).toISOString(),
      organization_id: Number(form.organization_id),
      max_claim_per_user: Number(form.max_claim_per_user) || 2,
    }
    try {
      if (imageFile) {
        const fd = new FormData()
        Object.entries(fields).forEach(([key, val]) => {
          if (val != null) fd.append(key, val)
        })
        fd.append('image', imageFile)
        if (editingId) {
          await campusApi.adminUpdateFood(editingId, fd)
          toast.success('Makanan diperbarui')
        } else {
          await campusApi.adminCreateFood(fd)
          toast.success('Makanan dipublish')
        }
      } else if (editingId) {
        await campusApi.adminUpdateFood(editingId, fields)
        toast.success('Makanan diperbarui')
      } else {
        await campusApi.adminCreateFood(fields)
        toast.success('Makanan dipublish')
      }
      setShowForm(false)
      resetForm()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal simpan')
    } finally {
      setSaving(false)
    }
  }

  async function setFoodStatus(id, next) {
    try {
      await campusApi.adminModerateFood(id, next)
      toast.success('Status makanan diperbarui')
      load()
    } catch {
      toast.error('Gagal ubah status')
    }
  }

  async function removeFood(id) {
    if (!confirm('Hapus posting makanan ini?')) return
    try {
      await campusApi.adminDeleteFood(id)
      toast.success('Makanan dihapus')
      load()
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Kelola Makanan"
        description="Buat dan kelola makanan sisa atas nama penyelenggara kampus."
        action={
          <Button size="sm" onClick={startCreate}>
            Tambah
          </Button>
        }
      />

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
        >
          <p className="text-sm font-semibold">
            {editingId ? 'Edit makanan' : 'Makanan baru'}
          </p>
          {orgs.length === 0 && (
            <p className="text-sm text-amber-700">
              Belum ada penyelenggara. Tambah dulu di Kelola Penyelenggara.
            </p>
          )}
          <Field
            label="Judul"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Field
            as="textarea"
            label="Deskripsi"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Penyelenggara</span>
              <select
                required
                className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={form.organization_id}
                onChange={(e) => setForm((p) => ({ ...p, organization_id: e.target.value }))}
              >
                <option value="">Pilih penyelenggara</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.type})
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Lokasi pengambilan"
              required
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
            <Field
              label="Jumlah"
              type="number"
              min="1"
              required
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            />
            <Field
              label="Satuan"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            />
            <Field
              label="Ambil sebelum"
              type="datetime-local"
              required
              value={form.pickup_until}
              onChange={(e) => setForm((p) => ({ ...p, pickup_until: e.target.value }))}
            />
            <Field
              label="Maks. klaim per orang"
              type="number"
              min="1"
              value={form.max_claim_per_user}
              onChange={(e) => setForm((p) => ({ ...p, max_claim_per_user: e.target.value }))}
            />
          </div>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Foto makanan (opsional)</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm"
              onChange={onImageChange}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt=""
                className="mt-2 h-28 w-full max-w-xs rounded-xl border border-[var(--line)] object-cover"
              />
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || orgs.length === 0}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <SearchBar value={q} onChange={setQ} placeholder="Cari judul, lokasi, atau penyelenggara…" />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatus(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                status === tab.id
                  ? 'bg-[var(--forest)] text-white'
                  : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
          Memuat…
        </p>
      ) : foods.length === 0 ? (
        <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] py-10 text-center text-sm text-[var(--muted)]">
          Tidak ada makanan.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-[var(--muted)]">
            Diurutkan berdasarkan prioritas penyelamatan.
          </p>
          {sortedFoods.map((food) => {
            const priority = computePriority(food)
            const freshness = computeFreshness(food)
            const impact = estimateFoodImpact(food)
            const endLabel = hoursLeftLabel(food.pickupUntil)
            const showAi = food.status === 'available' && priority.urgent

            return (
              <div
                key={food.id}
                className={`lift flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between ${
                  showAi ? 'border-amber-200' : 'border-[var(--line)]'
                }`}
              >
                {food.image && (
                  <img
                    src={food.image}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-xl border border-[var(--line)] object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={food.status === 'claimed' ? 'claimed' : food.status}>
                      {foodStatusLabel(food)}
                    </Badge>
                    {showAi && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        <Sparkles size={11} aria-hidden />
                        Prioritas AI
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold">{food.title}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    Sisa {food.remaining}/{food.quantity} {food.unit} · {food.location}
                  </p>
                  {showAi && (
                    <div className="mt-1.5 space-y-0.5 text-xs text-amber-900/85">
                      {endLabel && <p>{endLabel}</p>}
                      <p>Freshness {freshness.percent}%</p>
                      <p>
                        AI memprioritaskan distribusi karena waktu pengambilan hampir habis.
                      </p>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {food.organization ? `Penyelenggara: ${food.organization} · ` : ''}
                    Ambil sebelum {formatPickup(food.pickupUntil)}
                  </p>
                  {food.status === 'available' && Number(food.remaining) > 0 && (
                    <p className="mt-1 text-xs font-medium text-[var(--forest)]">{impact.short}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(food)}>
                    Edit
                  </Button>
                  {food.status !== 'available' && (
                    <Button size="sm" variant="secondary" onClick={() => setFoodStatus(food.id, 'available')}>
                      Buka lagi
                    </Button>
                  )}
                  {food.status === 'available' && (
                    <Button size="sm" variant="secondary" onClick={() => setFoodStatus(food.id, 'expired')}>
                      Tutup
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeFood(food.id)}>
                    Hapus
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
