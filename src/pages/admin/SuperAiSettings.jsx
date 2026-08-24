import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

const LISTING_TYPES = [
  { id: 'sell', label: 'Jual' },
  { id: 'borrow', label: 'Pinjam' },
  { id: 'donate', label: 'Donasi' },
  { id: 'exchange', label: 'Tukar' },
]

const CONDITIONS = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu perbaikan']

const EMPTY_RULE = {
  keysText: '',
  category: '',
  condition: 'Baik',
  listingType: 'sell',
}

function rulesFromApi(rows = []) {
  return rows.map((row) => ({
    keysText: (row.keys || []).join(', '),
    category: row.category || '',
    condition: row.condition || 'Baik',
    listingType: row.listingType || 'sell',
  }))
}

function rulesToApi(rows) {
  return rows
    .map((row) => ({
      keys: row.keysText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      category: row.category.trim(),
      condition: row.condition,
      listingType: row.listingType,
    }))
    .filter((row) => row.keys.length > 0 && row.category)
}

export default function SuperAiSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [testInput, setTestInput] = useState('Kalkulator Casio FX-991')
  const [form, setForm] = useState({
    item_prompt: '',
    food_prompt: '',
    description_template: '',
    price_elektronik: 75000,
    price_default: 25000,
    rules: [{ ...EMPTY_RULE }],
  })

  useEffect(() => {
    campusApi
      .adminAiSettings()
      .then((data) => {
        const rules = rulesFromApi(data.keyword_map)
        setForm({
          item_prompt: data.item_prompt || '',
          food_prompt: data.food_prompt || '',
          description_template: data.description_template || '',
          price_elektronik: data.price_elektronik ?? 75000,
          price_default: data.price_default ?? 25000,
          rules: rules.length > 0 ? rules : [{ ...EMPTY_RULE }],
        })
      })
      .catch(() => toast.error('Gagal memuat pengaturan AI'))
      .finally(() => setLoading(false))
  }, [])

  function updateRule(index, patch) {
    setForm((p) => ({
      ...p,
      rules: p.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }))
  }

  function addRule() {
    setForm((p) => ({ ...p, rules: [...p.rules, { ...EMPTY_RULE }] }))
  }

  function removeRule(index) {
    setForm((p) => ({
      ...p,
      rules: p.rules.length <= 1 ? [{ ...EMPTY_RULE }] : p.rules.filter((_, i) => i !== index),
    }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    const keyword_map = rulesToApi(form.rules)
    if (keyword_map.length === 0) {
      toast.error('Isi minimal satu aturan kata kunci yang lengkap')
      return
    }

    setSaving(true)
    try {
      await campusApi.adminUpdateAiSettings({
        item_prompt: form.item_prompt,
        food_prompt: form.food_prompt,
        description_template: form.description_template,
        price_elektronik: Number(form.price_elektronik) || 0,
        price_default: Number(form.price_default) || 0,
        keyword_map,
      })
      toast.success('Pengaturan AI disimpan — berlaku untuk semua kampus')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function runPreview() {
    setTesting(true)
    setPreview(null)
    try {
      const result = await campusApi.analyzeItem({
        title: testInput,
        description: '',
        file_name: '',
      })
      setPreview(result)
    } catch {
      toast.error('Gagal menjalankan uji coba')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Pengaturan AI"
        description="Atur bantuan AI saat mahasiswa upload barang atau makanan — berlaku di semua kampus."
      />

      <section className="rounded-2xl border border-[var(--forest)]/20 bg-[#eef3f0] px-5 py-4">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="mt-0.5 shrink-0 text-[var(--forest)]" />
          <div className="text-sm">
            <p className="font-medium text-[var(--forest)]">Apa yang diatur di sini?</p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[var(--muted)]">
              <li>
                <strong className="text-[var(--ink)]">Aturan kata kunci</strong> — jika judul/deskripsi
                mengandung kata tertentu, AI isi kategori & jenis listing otomatis
              </li>
              <li>
                <strong className="text-[var(--ink)]">Template deskripsi</strong> — teks saran yang muncul
                setelah analisis barang
              </li>
              <li>
                <strong className="text-[var(--ink)]">Estimasi harga</strong> — patokan harga jual otomatis
              </li>
            </ul>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Memuat…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-5">
            <div>
              <h2 className="font-display text-base font-semibold">Analisis barang</h2>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                Dipakai saat mahasiswa upload barang dan menekan analisis AI.
              </p>
            </div>

            <Field
              as="textarea"
              label="Instruksi analisis barang"
              hint="Ditambahkan di awal ringkasan hasil analisis (opsional)"
              rows={2}
              value={form.item_prompt}
              onChange={(e) => setForm((p) => ({ ...p, item_prompt: e.target.value }))}
            />

            <Field
              label="Template deskripsi hasil"
              hint="Variabel: {category} = kategori, {condition} = kondisi, {listingType} = jual/pinjam/donasi/tukar"
              value={form.description_template}
              onChange={(e) => setForm((p) => ({ ...p, description_template: e.target.value }))}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Estimasi harga elektronik (Rp)"
                type="number"
                min="0"
                value={form.price_elektronik}
                onChange={(e) => setForm((p) => ({ ...p, price_elektronik: e.target.value }))}
              />
              <Field
                label="Estimasi harga lainnya (Rp)"
                type="number"
                min="0"
                value={form.price_default}
                onChange={(e) => setForm((p) => ({ ...p, price_default: e.target.value }))}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold">Aturan kata kunci</h2>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  Contoh: jika ada kata &quot;kalkulator&quot; → kategori Elektronik, jenis Jual.
                </p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={addRule}>
                Tambah aturan
              </Button>
            </div>

            <div className="space-y-3">
              {form.rules.map((rule, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-xl border border-[var(--line)] bg-[#f8faf9] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Aturan {index + 1}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-red-700 hover:underline"
                      onClick={() => removeRule(index)}
                    >
                      Hapus
                    </button>
                  </div>
                  <Field
                    label="Kata kunci"
                    hint="Pisahkan dengan koma, contoh: kalkulator, casio, mouse"
                    value={rule.keysText}
                    onChange={(e) => updateRule(index, { keysText: e.target.value })}
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                      label="Kategori"
                      hint="Harus ada di Kelola Kategori (jenis Barang)"
                      value={rule.category}
                      onChange={(e) => updateRule(index, { category: e.target.value })}
                    />
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium">Kondisi</span>
                      <select
                        className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                        value={rule.condition}
                        onChange={(e) => updateRule(index, { condition: e.target.value })}
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-medium">Jenis listing</span>
                      <select
                        className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                        value={rule.listingType}
                        onChange={(e) => updateRule(index, { listingType: e.target.value })}
                      >
                        {LISTING_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-5">
            <div>
              <h2 className="font-display text-base font-semibold">Prediksi makanan</h2>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                Dipakai saat mahasiswa upload makanan dan menekan prediksi AI.
              </p>
            </div>
            <Field
              as="textarea"
              label="Instruksi prediksi makanan"
              rows={2}
              value={form.food_prompt}
              onChange={(e) => setForm((p) => ({ ...p, food_prompt: e.target.value }))}
            />
          </section>

          <section className="space-y-3 rounded-2xl border border-dashed border-[var(--line)] bg-white p-5">
            <h2 className="font-display text-base font-semibold">Uji coba analisis barang</h2>
            <p className="text-sm text-[var(--muted)]">
              Cek hasil AI sebelum disimpan — menggunakan pengaturan yang sudah ada di server. Simpan dulu
              jika baru mengubah aturan.
            </p>
            <div className="flex flex-wrap gap-2">
              <Field
                className="min-w-[200px] flex-1"
                label="Judul barang uji coba"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
              />
              <div className="flex items-end">
                <Button type="button" variant="secondary" disabled={testing} onClick={runPreview}>
                  {testing ? 'Menguji…' : 'Jalankan uji coba'}
                </Button>
              </div>
            </div>
            {preview && (
              <div className="rounded-xl bg-[#eef3f0] p-4 text-sm">
                <p className="font-medium text-[var(--forest)]">Hasil analisis</p>
                <p className="mt-2 text-[var(--muted)]">{preview.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="available">{preview.category}</Badge>
                  <Badge tone="borrow">{preview.condition}</Badge>
                  <Badge tone="approved">
                    {LISTING_TYPES.find((t) => t.id === preview.listingType)?.label ||
                      preview.listingType}
                  </Badge>
                  {preview.suggestedPrice > 0 && (
                    <span className="text-xs font-semibold text-[var(--forest)]">
                      ~Rp {Number(preview.suggestedPrice).toLocaleString('id-ID')}
                    </span>
                  )}
                  <span className="text-xs text-[var(--muted)]">Keyakinan {preview.confidence}%</span>
                </div>
              </div>
            )}
          </section>

          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan pengaturan AI'}
          </Button>
        </form>
      )}
    </div>
  )
}
