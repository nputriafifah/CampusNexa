import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { roleLabel } from '../../lib/roles'
import { useAuth } from '../../context/AuthContext'

const ROLE_FILTERS = [
  { id: 'all', label: 'Semua role' },
  { id: 'student', label: 'Mahasiswa' },
  { id: 'campus_admin', label: 'Admin kampus' },
  { id: 'super_admin', label: 'Super Admin' },
]

function accountStatusLabel(status) {
  return status === 'inactive' ? 'Nonaktif' : 'Aktif'
}

export default function AllUsersAdmin() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [role, setRole] = useState('all')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const load = useCallback(() => {
    setLoading(true)
    campusApi
      .adminUsers({ q: debouncedQ || undefined, role: role === 'all' ? undefined : role })
      .then(setUsers)
      .catch(() => toast.error('Gagal memuat pengguna'))
      .finally(() => setLoading(false))
  }, [debouncedQ, role])

  useEffect(() => {
    load()
  }, [load])

  async function setUserRole(id, nextRole) {
    try {
      await campusApi.adminUpdateUserRole(id, nextRole)
      toast.success('Peran diperbarui')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal ubah peran')
    }
  }

  async function toggleStatus(u) {
    const next = u.accountStatus === 'inactive' ? 'active' : 'inactive'
    try {
      await campusApi.adminUpdateUserStatus(u.id, next)
      toast.success(next === 'active' ? 'Akun diaktifkan' : 'Akun dinonaktifkan')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal ubah status')
    }
  }

  const isSelf = (u) => String(u.id) === String(me?.id)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Semua Pengguna"
        description="Lihat dan atur peran serta status akun lintas universitas."
      />

      <div className="space-y-3">
        <SearchBar value={q} onChange={setQ} placeholder="Cari nama atau email…" />
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={role === f.id}
              onClick={() => setRole(f.id)}
              label={f.label}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
            Memuat…
          </p>
        )}

        {!loading &&
          users.map((u) => {
            const open = openId === u.id
            return (
              <div
                key={u.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  open ? 'border-[var(--forest)]/40 shadow-sm' : 'border-[var(--line)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : u.id)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="available">{roleLabel(u.role)}</Badge>
                      <Badge tone={u.accountStatus === 'inactive' ? 'expired' : 'approved'}>
                        {accountStatusLabel(u.accountStatus)}
                      </Badge>
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold">{u.name}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      {u.email} · {u.university || 'Tanpa kampus'}
                    </p>
                  </div>
                  {open ? (
                    <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  )}
                </button>

                {open && (
                  <div className="border-t border-[var(--line)] bg-[#f8faf9] px-4 py-3">
                    {isSelf(u) ? (
                      <p className="text-sm text-[var(--muted)]">
                        Ini akun kamu — peran dan status tidak bisa diubah dari sini.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-[var(--muted)]">Ubah peran</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {u.role !== 'student' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setUserRole(u.id, 'student')}
                            >
                              Jadikan mahasiswa
                            </Button>
                          )}
                          {u.role !== 'campus_admin' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setUserRole(u.id, 'campus_admin')}
                              disabled={!u.university && u.role !== 'campus_admin'}
                              title={!u.university ? 'User harus punya kampus' : undefined}
                            >
                              Admin kampus
                            </Button>
                          )}
                          {u.role !== 'super_admin' && (
                            <Button size="sm" onClick={() => setUserRole(u.id, 'super_admin')}>
                              Super Admin
                            </Button>
                          )}
                        </div>
                        {!u.university && u.role === 'student' && (
                          <p className="mt-2 text-xs text-amber-700">
                            User belum terhubung ke universitas — tidak bisa dijadikan admin kampus.
                          </p>
                        )}
                        <div className="mt-3 border-t border-[var(--line)] pt-3">
                          <Button size="sm" variant="ghost" onClick={() => toggleStatus(u)}>
                            {u.accountStatus === 'inactive' ? 'Aktifkan akun' : 'Nonaktifkan akun'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

        {!loading && users.length === 0 && (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] py-10 text-center text-sm text-[var(--muted)]">
            Tidak ada pengguna untuk filter ini.
          </p>
        )}
      </div>
    </div>
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
