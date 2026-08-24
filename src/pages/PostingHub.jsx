import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Camera, ChevronRight, Clock3, Leaf, Package, Sparkles, Upload, Utensils } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'

const conceptBadges = [
  { label: 'Resource Exchange', icon: Leaf },
  { label: 'Food Rescue', icon: Utensils },
  { label: 'AI Assistant', icon: Sparkles },
]

const choices = [
  {
    to: '/app/posting/barang',
    title: 'Barang',
    desc: 'Jual, tukar, donasi, atau pinjam.',
    highlight: 'AI bantu dari foto',
    hint: 'AI akan membantu menganalisis foto barang.',
    icon: Package,
    tone: 'bg-[#cfe4d8] text-[#134232]',
    image:
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=640&q=80',
    imageAlt: 'Contoh barang kampus',
  },
  {
    to: '/app/posting/makanan',
    title: 'Makanan',
    desc: 'Bagikan makanan berlebih.',
    highlight: 'Food Rescue sebelum basi',
    hint: 'Posting akan ditutup otomatis setelah waktu pengambilan berakhir.',
    icon: Utensils,
    tone: 'bg-[#efe0c4] text-[#7a4b0f]',
    image:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=640&q=80',
    imageAlt: 'Contoh food rescue kampus',
  },
]

const aiSteps = [
  {
    step: '1',
    title: 'Unggah foto',
    desc: 'Cukup ambil gambar barang atau makanan.',
    icon: Upload,
  },
  {
    step: '2',
    title: 'AI menganalisis',
    desc: 'Kategori, kondisi, estimasi harga, dan deskripsi dibuat otomatis.',
    icon: Sparkles,
  },
  {
    step: '3',
    title: 'Publikasikan',
    desc: 'Tinjau hasilnya, sesuaikan bila perlu, lalu posting.',
    icon: Camera,
  },
]

export default function PostingHub() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')

  if (['sell', 'exchange', 'borrow', 'donate'].includes(type)) {
    return <Navigate to={`/app/posting/barang?type=${type}`} replace />
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Posting" description="Mau bagikan apa ke kampus?" />

      <div className="flex flex-wrap gap-2">
        {conceptBadges.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--forest-deep)]"
          >
            <Icon size={13} />
            {label}
          </span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {choices.map(({ to, title, desc, highlight, hint, icon: Icon, tone, image, imageAlt }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white transition hover:-translate-y-0.5 hover:border-[var(--forest)] hover:shadow-[0_12px_28px_rgba(19,66,50,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-[var(--mint)]">
              <img
                src={image}
                alt={imageAlt}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              <span
                className={`absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
              >
                <Icon size={18} />
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl font-semibold text-[var(--ink)] group-hover:text-[var(--forest)]">
                  {title}
                </h2>
                <ChevronRight
                  size={18}
                  className="mt-1 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--forest)]"
                />
              </div>
              <p className="text-sm text-[var(--muted)]">{desc}</p>
              <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-[11px] font-semibold text-[var(--forest-deep)]">
                {title === 'Makanan' ? <Clock3 size={11} /> : <Sparkles size={11} />}
                {highlight}
              </p>
              <p className="mt-auto pt-1 text-xs leading-relaxed text-[var(--muted)] transition group-hover:text-[var(--forest)] group-focus-visible:text-[var(--forest)]">
                {hint}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--forest)]">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
              AI membantu dalam 3 langkah
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Pintu masuk fitur unggulan CampusNexa — dari foto ke posting siap tayang.
            </p>
          </div>
        </div>

        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {aiSteps.map(({ step, title, desc, icon: Icon }) => (
            <li
              key={step}
              className="rounded-2xl border border-[var(--line)] bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--forest)] text-xs font-bold text-white">
                  {step}
                </span>
                <Icon size={16} className="text-[var(--forest)]" />
              </div>
              <p className="mt-3 font-semibold text-[var(--ink)]">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
