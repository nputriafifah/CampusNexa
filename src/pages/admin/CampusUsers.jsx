import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Badge, listingLabel, statusLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { roleLabel } from '../../lib/roles'
import { useAuth } from '../../context/AuthContext'
import { formatKg } from '../../lib/format'

const ROLE_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'student', label: 'Mahasiswa' },
  { id: 'campus_admin', label: 'Admin' },
]

const STATUS_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Nonaktif' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoneyShort(n) {
  const num = Number(n) || 0
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)} jt`
  if (num >= 1_000) return `Rp ${Math.round(num / 1_000)} rb`
  return `Rp ${num.toLocaleString('id-ID')}`
}

/** Akun organisasi / unit (bukan mahasiswa individu). */
function isOrganizationAccount(u) {
  if (!u || u.role === 'campus_admin' || u.role === 'super_admin') return false
  if (/^(BEM|HIMA|UKM|Kantin)\b/i.test(u.name || '')) return true
  return Boolean(u.organizationId) && !u.faculty && !u.studyProgram
}

function isProfileIncomplete(u) {
  if (isOrganizationAccount(u) || u.role === 'campus_admin') return false
  return !u.faculty || !u.studyProgram
}

function isActiveAccount(u) {
  return (u.accountStatus || 'active') !== 'inactive'
}

function summarizeUsers(list = []) {
  const students = list.filter((u) => u.role === 'student' && !isOrganizationAccount(u))
  return {
    activeStudents: students.filter(isActiveAccount).length,
    incompleteProfiles: students.filter(isProfileIncomplete).length,
    admins: list.filter((u) => u.role === 'campus_admin').length,
    organizations: list.filter(isOrganizationAccount).length,
  }
}

export default function CampusUsers() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [summary, setSummary] = useState(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [role, setRoleFilter] = useState('all')
  const [accountStatus, setAccountStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const refreshSummary = useCallback(() => {
    campusApi
      .adminUsers({})
      .then((list) => setSummary(summarizeUsers(list)))
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    campusApi
      .adminUsers({
        q: debouncedQ || undefined,
        role: role === 'all' ? undefined : role,
        account_status: accountStatus === 'all' ? undefined : accountStatus,
      })
      .then(setUsers)
      .catch(() => toast.error('Gagal memuat pengguna'))
      .finally(() => setLoading(false))
  }, [debouncedQ, role, accountStatus])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    refreshSummary()
  }, [refreshSummary])

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true)
    try {
      const data = await campusApi.adminUser(id)
      setDetail(data)
    } catch {
      toast.error('Gagal memuat detail pengguna')
      setDetail(null)
      setOpenId(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (openId) loadDetail(openId)
    else setDetail(null)
  }, [openId, loadDetail])

  function toggleOpen(id) {
    setOpenId((prev) => (prev === id ? null : id))
  }

  async function setRole(id, nextRole) {
    const label =
      nextRole === 'campus_admin'
        ? 'Jadikan pengguna ini admin kampus?'
        : 'Turunkan admin kembali jadi mahasiswa?'
    if (!window.confirm(label)) return
    try {
      await campusApi.adminUpdateUserRole(id, nextRole)
      toast.success(nextRole === 'campus_admin' ? 'Jadi admin kampus' : 'Kembali jadi mahasiswa')
      load()
      refreshSummary()
      if (openId === String(id)) loadDetail(id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal ubah role')
    }
  }

  async function setStatus(id, nextStatus) {
    const label =
      nextStatus === 'inactive' ? 'Nonaktifkan akun ini?' : 'Aktifkan kembali akun ini?'
    if (!window.confirm(label)) return
    try {
      await campusApi.adminUpdateUserStatus(id, nextStatus)
      toast.success(nextStatus === 'inactive' ? 'Akun dinonaktifkan' : 'Akun diaktifkan')
      load()
      refreshSummary()
      if (openId === String(id)) loadDetail(id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal ubah status akun')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Kelola Mahasiswa"
        description="Cari, lihat dampak, dan kelola status akun mahasiswa di kampusmu."
      />

      {summary && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Mahasiswa aktif" value={summary.activeStudents} />
          <SummaryStat label="Profil belum lengkap" value={summary.incompleteProfiles} />
          <SummaryStat label="Admin" value={summary.admins} />
          <SummaryStat label="Organisasi" value={summary.organizations} />
        </section>
      )}

      <div className="space-y-3">
        <SearchBar value={q} onChange={setQ} placeholder="Cari nama atau email…" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {ROLE_TABS.map((tab) => (
              <FilterChip
                key={tab.id}
                active={role === tab.id}
                onClick={() => setRoleFilter(tab.id)}
                label={tab.label}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[var(--muted)]">Status</span>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAccountStatusFilter(tab.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  accountStatus === tab.id
                    ? 'bg-[#e8efea] text-[var(--forest)] ring-1 ring-[var(--forest)]/30'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
            Memuat…
          </p>
        )}

        {!loading && users.length === 0 && (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] py-10 text-center text-sm text-[var(--muted)]">
            Tidak ada pengguna.
          </p>
        )}

        {!loading &&
          users.map((u) => {
            const isMe = String(u.id) === String(me?.id)
            const inactive = !isActiveAccount(u)
            const open = openId === String(u.id)
            const impact = u.impact || {}
            const orgAccount = isOrganizationAccount(u)
            const incomplete = isProfileIncomplete(u)
            const facultyLine = [u.faculty, u.studyProgram].filter(Boolean).join(' · ')

            return (
              <div
                key={u.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  open ? 'border-[var(--forest)]/40 shadow-sm' : 'border-[var(--line)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleOpen(String(u.id))}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      inactive
                        ? 'bg-[#f3f4f6] text-[var(--muted)]'
                        : 'bg-[#e8efea] text-[var(--forest)]'
                    }`}
                  >
                    {u.avatar || u.name?.slice(0, 2)?.toUpperCase() || '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-display text-base font-semibold text-[var(--ink)]">
                        {u.name}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">
                            (kamu)
                          </span>
                        )}
                      </h3>
                      <AccountStatusBadge active={!inactive} />
                      <RoleBadge role={u.role} organization={orgAccount} />
                    </div>

                    <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{u.email}</p>

                    {incomplete ? (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                        <AlertTriangle size={12} className="shrink-0" aria-hidden />
                        Profil belum lengkap
                        <span className="font-normal text-[var(--muted)]">
                          · Bergabung {formatDate(u.createdAt)}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-[var(--muted)]">
                        {orgAccount
                          ? u.organization
                            ? `Terhubung ${u.organization}`
                            : 'Akun organisasi'
                          : facultyLine || '—'}
                        {' · '}
                        Bergabung {formatDate(u.createdAt)}
                      </p>
                    )}

                    <p className="mt-1.5 text-xs text-[var(--ink)]/70">
                      {impact.itemsSaved ?? 0} barang · {formatKg(impact.foodRescuedKg)} food ·{' '}
                      {formatMoneyShort(impact.moneySaved)} hemat
                    </p>
                  </div>

                  {open ? (
                    <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  )}
                </button>

                {open && (
                  <UserDetailBody
                    detail={detail}
                    loading={detailLoading}
                    me={me}
                    onSetRole={setRole}
                    onSetStatus={setStatus}
                  />
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-[var(--forest)]">{value}</p>
    </div>
  )
}

function AccountStatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`}
        aria-hidden
      />
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

function RoleBadge({ role, organization }) {
  if (organization) {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
        Organisasi
      </span>
    )
  }
  if (role === 'campus_admin') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
        Admin Kampus
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
      Mahasiswa
    </span>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-[var(--forest)] text-white'
          : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]'
      }`}
    >
      {label}
    </button>
  )
}

function UserDetailBody({ detail, loading, me, onSetRole, onSetStatus }) {
  if (loading) {
    return (
      <div className="border-t border-[var(--line)] px-4 py-5">
        <p className="text-sm text-[var(--muted)]">Memuat detail…</p>
      </div>
    )
  }

  if (!detail) return null

  const isMe = String(detail.id) === String(me?.id)
  const inactive = !isActiveAccount(detail)
  const impact = detail.impact || {}
  const stats = detail.stats || {}
  const orgAccount = isOrganizationAccount(detail)
  const incomplete = isProfileIncomplete(detail)

  return (
    <div className="border-t border-[var(--line)] bg-[#f8faf9] px-4 py-4">
      {incomplete && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          <AlertTriangle size={14} className="shrink-0" aria-hidden />
          Profil belum lengkap — fakultas atau prodi masih kosong
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailStat label="Barang terselamatkan" value={impact.itemsSaved ?? 0} />
        <DetailStat label="Food rescue" value={formatKg(impact.foodRescuedKg)} />
        <DetailStat label="Limbah dikurangi" value={formatKg(impact.wasteReducedKg)} />
        <DetailStat label="Estimasi hemat" value={formatMoneyShort(impact.moneySaved)} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <InfoBlock title="Profil">
          <InfoRow label="Fakultas" value={detail.faculty} />
          <InfoRow label="Prodi" value={detail.studyProgram} />
          <InfoRow label="Organisasi" value={detail.organization} />
          <InfoRow label="WhatsApp" value={detail.whatsapp} />
        </InfoBlock>
        <InfoBlock title="Aktivitas">
          <InfoRow
            label="Listing"
            value={`${stats.itemsTotal ?? 0} total · ${stats.itemsAvailable ?? 0} tersedia`}
          />
          <InfoRow
            label="Food"
            value={`${stats.foodsTotal ?? 0} total · ${stats.foodsAvailable ?? 0} tersedia`}
          />
          <InfoRow label="Bergabung" value={formatDate(detail.createdAt)} />
          <InfoRow
            label="Role"
            value={orgAccount ? 'Organisasi' : roleLabel(detail.role)}
          />
        </InfoBlock>
      </div>

      {(detail.recentItems || []).length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-[var(--muted)]">Listing terbaru</p>
          <ul className="mt-2 space-y-2">
            {detail.recentItems.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={item.listingType}>{listingLabel(item.listingType)}</Badge>
                  <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
                </div>
                <p className="mt-1 text-sm font-medium">{item.title}</p>
                <p className="text-xs text-[var(--muted)]">{item.location || '—'}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isMe && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
          {detail.role === 'student' && !inactive && !orgAccount && (
            <Button size="sm" variant="secondary" onClick={() => onSetRole(detail.id, 'campus_admin')}>
              Jadikan admin
            </Button>
          )}
          {detail.role === 'campus_admin' && (
            <Button size="sm" variant="secondary" onClick={() => onSetRole(detail.id, 'student')}>
              Turunkan ke mahasiswa
            </Button>
          )}
          <Button
            size="sm"
            variant={inactive ? 'secondary' : 'danger'}
            onClick={() => onSetStatus(detail.id, inactive ? 'active' : 'inactive')}
          >
            {inactive ? 'Aktifkan akun' : 'Nonaktifkan akun'}
          </Button>
        </div>
      )}
    </div>
  )
}

function DetailStat({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-base font-semibold text-[var(--forest)]">{value}</p>
    </div>
  )
}

function InfoBlock({ title, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--muted)]">{title}</p>
      <ul className="mt-2 space-y-1.5">{children}</ul>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <li className="flex gap-2 text-sm">
      <span className="w-24 shrink-0 text-[var(--muted)]">{label}</span>
      <span className="text-[var(--ink)]">{value || '—'}</span>
    </li>
  )
}
