import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Field } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Tabs'

const STATUS_FILTERS = [
  { id: 'all', label: 'Semua status' },
  { id: 'open', label: 'Terbuka' },
  { id: 'closed', label: 'Ditutup' },
]

const emptyEvent = {
  title: '',
  description: '',
  location: '',
  organizer: '',
  organization_id: '',
  whatsapp_url: '',
  contact_note: '',
  starts_at: '',
  ends_at: '',
  quota: '40',
}

const emptyVolunteer = {
  title: '',
  description: '',
  location: '',
  organizer: '',
  organization_id: '',
  event_id: '',
  whatsapp_url: '',
  contact_note: '',
  starts_at: '',
  quota: '12',
}

function orgName(orgs, id) {
  const o = orgs.find((x) => String(x.id) === String(id))
  return o?.name || ''
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function relativeStartsLabel(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  const days = Math.round(ms / (1000 * 60 * 60 * 24))
  if (ms < -12 * 60 * 60 * 1000) return 'Sudah lewat'
  if (days <= 0) return 'Hari ini'
  if (days === 1) return 'Besok'
  if (days < 7) return `${days} hari lagi`
  const weeks = Math.round(days / 7)
  return weeks === 1 ? '1 minggu lagi' : `${weeks} minggu lagi`
}

function eventIdKey(id) {
  return String(id || '').replace(/^e/, '')
}

function volunteerJobsForEvent(volunteers, event) {
  const key = eventIdKey(event.dbId || event.id)
  return volunteers.filter((v) => eventIdKey(v.eventId) === key)
}

function eventsForVolunteerSelect(events, openEvents, editingVolunteerId, selectedEventId) {
  if (!editingVolunteerId) return openEvents
  const selected = events.find((e) => String(e.dbId || e.id) === String(selectedEventId))
  if (selected && !openEvents.some((e) => e.id === selected.id)) {
    return [selected, ...openEvents]
  }
  return openEvents.length > 0 ? openEvents : events
}

function eventTitle(events, eventId) {
  const id = String(eventId || '').replace(/^e/, '')
  const ev = events.find((e) => String(e.dbId || e.id) === id)
  return ev?.title || '—'
}

function matchesSearch(row, query) {
  if (!query) return true
  const hay = [row.title, row.organizer, row.location, row.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(query.toLowerCase())
}

function matchesStatus(row, status) {
  if (status === 'all') return true
  return row.status === status
}

export default function CampusCommunity() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'volunteer' ? 'volunteer' : 'event'
  const [events, setEvents] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [eventForm, setEventForm] = useState(emptyEvent)
  const [volForm, setVolForm] = useState(emptyVolunteer)
  const [saving, setSaving] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [editingVolunteerId, setEditingVolunteerId] = useState(null)
  const [signupOpen, setSignupOpen] = useState(null)
  const [signups, setSignups] = useState([])
  const [signupLoading, setSignupLoading] = useState(false)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  function setTab(next) {
    const params = new URLSearchParams(searchParams)
    if (next === 'event') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
    setShowForm(false)
    setEditingEventId(null)
    setEditingVolunteerId(null)
    setSignupOpen(null)
    setOpenId(null)
    setQ('')
    setStatusFilter('all')
  }

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([campusApi.adminCommunity(), campusApi.adminOrganizations()])
      .then(([data, orgRows]) => {
        setEvents(data.events || [])
        setVolunteers(data.volunteers || [])
        setOrgs(orgRows || [])
      })
      .catch(() => toast.error('Gagal muat komunitas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredEvents = useMemo(
    () => events.filter((ev) => matchesSearch(ev, debouncedQ) && matchesStatus(ev, statusFilter)),
    [events, debouncedQ, statusFilter],
  )

  const filteredVolunteers = useMemo(
    () => volunteers.filter((v) => matchesSearch(v, debouncedQ) && matchesStatus(v, statusFilter)),
    [volunteers, debouncedQ, statusFilter],
  )

  function startCreateEvent() {
    setEditingEventId(null)
    setEventForm({ ...emptyEvent, organization_id: orgs[0] ? String(orgs[0].id) : '' })
    setShowForm(true)
  }

  function startEditEvent(ev) {
    const match = orgs.find((o) => o.name === ev.organizer)
    setEditingEventId(ev.dbId || ev.id)
    setEventForm({
      title: ev.title || '',
      description: ev.description || '',
      location: ev.location || '',
      organizer: ev.organizer || '',
      organization_id: match ? String(match.id) : '',
      whatsapp_url: ev.whatsappUrl || '',
      contact_note: ev.contactNote || '',
      starts_at: toLocalInput(ev.startsAt),
      ends_at: toLocalInput(ev.endsAt),
      quota: String(ev.quota || 40),
    })
    setShowForm(true)
    setOpenId(null)
  }

  function startCreateVolunteer() {
    setEditingVolunteerId(null)
    setVolForm({
      ...emptyVolunteer,
      organization_id: orgs[0] ? String(orgs[0].id) : '',
      event_id: openEvents[0] ? String(openEvents[0].dbId || openEvents[0].id) : '',
    })
    setShowForm(true)
  }

  function startEditVolunteer(v) {
    const match = orgs.find((o) => o.name === v.organizer)
    const eventDbId = v.eventId ? String(v.eventId).replace(/^e/, '') : ''
    setEditingVolunteerId(v.dbId || v.id)
    setVolForm({
      title: v.title || '',
      description: v.description || '',
      location: v.location || '',
      organizer: v.organizer || '',
      organization_id: match ? String(match.id) : '',
      event_id: eventDbId,
      whatsapp_url: v.whatsappUrl || '',
      contact_note: v.contactNote || '',
      starts_at: toLocalInput(v.startsAt),
      quota: String(v.quota || 12),
    })
    setShowForm(true)
    setOpenId(null)
  }

  async function saveEvent(e) {
    e.preventDefault()
    const organizer = orgName(orgs, eventForm.organization_id) || eventForm.organizer
    if (!organizer) {
      toast.error('Pilih penyelenggara')
      return
    }
    setSaving(true)
    const payload = {
      title: eventForm.title,
      description: eventForm.description || null,
      location: eventForm.location,
      organizer,
      quota: Number(eventForm.quota) || 1,
      whatsapp_url: eventForm.whatsapp_url || null,
      contact_note: eventForm.contact_note || null,
      starts_at: new Date(eventForm.starts_at).toISOString(),
      ends_at: eventForm.ends_at ? new Date(eventForm.ends_at).toISOString() : null,
    }
    try {
      if (editingEventId) {
        await campusApi.adminUpdateEvent(editingEventId, payload)
        toast.success('Acara diperbarui')
      } else {
        await campusApi.adminCreateEvent(payload)
        toast.success('Acara ditambahkan')
      }
      setEventForm(emptyEvent)
      setEditingEventId(null)
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal simpan acara')
    } finally {
      setSaving(false)
    }
  }

  async function saveVolunteer(e) {
    e.preventDefault()
    if (!volForm.event_id) {
      toast.error('Relawan harus terkait acara')
      return
    }
    const organizer = orgName(orgs, volForm.organization_id) || volForm.organizer
    if (!organizer) {
      toast.error('Pilih penyelenggara')
      return
    }
    setSaving(true)
    const payload = {
      title: volForm.title,
      description: volForm.description || null,
      location: volForm.location,
      organizer,
      event_id: Number(volForm.event_id),
      quota: Number(volForm.quota) || 1,
      whatsapp_url: volForm.whatsapp_url || null,
      contact_note: volForm.contact_note || null,
      starts_at: new Date(volForm.starts_at).toISOString(),
    }
    try {
      if (editingVolunteerId) {
        await campusApi.adminUpdateVolunteer(editingVolunteerId, payload)
        toast.success('Lowongan relawan diperbarui')
      } else {
        await campusApi.adminCreateVolunteer(payload)
        toast.success('Lowongan relawan ditambahkan')
      }
      setVolForm(emptyVolunteer)
      setEditingVolunteerId(null)
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal simpan relawan')
    } finally {
      setSaving(false)
    }
  }

  async function closeEvent(id) {
    try {
      await campusApi.adminUpdateEvent(id, { status: 'closed' })
      toast.success('Acara ditutup')
      load()
    } catch {
      toast.error('Gagal menutup')
    }
  }

  async function removeEvent(id) {
    if (!confirm('Hapus acara ini?')) return
    try {
      await campusApi.adminDeleteEvent(id)
      toast.success('Acara dihapus')
      setOpenId(null)
      setSignupOpen(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal hapus')
    }
  }

  async function closeVolunteer(id) {
    try {
      await campusApi.adminUpdateVolunteer(id, { status: 'closed' })
      toast.success('Lowongan ditutup')
      load()
    } catch {
      toast.error('Gagal menutup')
    }
  }

  async function removeVolunteer(id) {
    if (!confirm('Hapus lowongan relawan ini?')) return
    try {
      await campusApi.adminDeleteVolunteer(id)
      toast.success('Dihapus')
      setOpenId(null)
      setSignupOpen(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal hapus')
    }
  }

  async function openSignups(kind, id, title, cardId) {
    setOpenId(cardId)
    setSignupOpen({ kind, id, title })
    setSignupLoading(true)
    try {
      const rows =
        kind === 'event'
          ? await campusApi.adminEventRegistrations(id)
          : await campusApi.adminVolunteerSignups(id)
      setSignups(rows || [])
    } catch {
      toast.error('Gagal muat pendaftar')
      setSignups([])
    } finally {
      setSignupLoading(false)
    }
  }

  async function updateSignupStatus(signupId, status) {
    try {
      await campusApi.adminUpdateVolunteerSignup(signupId, status)
      toast.success(status === 'approved' ? 'Relawan disetujui' : 'Pendaftaran ditolak')
      if (signupOpen) {
        openSignups(signupOpen.kind, signupOpen.id, signupOpen.title, openId)
      }
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal update pendaftar')
    }
  }

  function toggleCard(id) {
    if (openId === id) {
      setOpenId(null)
      setSignupOpen(null)
      setSignups([])
    } else {
      setOpenId(id)
      setSignupOpen(null)
      setSignups([])
    }
  }

  const openEvents = events.filter((e) => e.status !== 'closed')
  const volunteerEventOptions = eventsForVolunteerSelect(
    events,
    openEvents,
    editingVolunteerId,
    volForm.event_id,
  )

  const activeList = tab === 'event' ? filteredEvents : filteredVolunteers
  const totalCount = tab === 'event' ? events.length : volunteers.length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Kelola Aksi Komunitas"
        description="Acara dan relawan atas nama penyelenggara kampus. Setiap lowongan relawan terhubung ke satu acara."
        action={
          <Button
            size="sm"
            onClick={() => {
              if (showForm && !editingEventId && !editingVolunteerId) {
                setShowForm(false)
                return
              }
              if (tab === 'event') startCreateEvent()
              else startCreateVolunteer()
            }}
          >
            {showForm && !editingEventId && !editingVolunteerId ? 'Tutup form' : 'Tambah'}
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'event', label: `Acara (${events.length})` },
          { id: 'volunteer', label: `Relawan (${volunteers.length})` },
        ]}
      />

      <div className="space-y-3">
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder={
            tab === 'event'
              ? 'Cari judul, penyelenggara, atau lokasi acara…'
              : 'Cari judul, penyelenggara, atau lokasi relawan…'
          }
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={statusFilter === f.id}
              onClick={() => setStatusFilter(f.id)}
              label={f.label}
            />
          ))}
        </div>
      </div>

      {showForm && tab === 'event' && (
        <form
          onSubmit={saveEvent}
          className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
        >
          <p className="text-sm font-semibold text-[var(--ink)]">
            {editingEventId ? 'Edit acara' : 'Acara baru'}
          </p>
          <Field
            label="Judul"
            required
            value={eventForm.title}
            onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Field
            as="textarea"
            label="Deskripsi"
            rows={3}
            value={eventForm.description}
            onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Lokasi"
              required
              value={eventForm.location}
              onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Penyelenggara</span>
              <select
                required
                className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={eventForm.organization_id}
                onChange={(e) =>
                  setEventForm((p) => ({ ...p, organization_id: e.target.value }))
                }
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
              label="Mulai"
              type="datetime-local"
              required
              value={eventForm.starts_at}
              onChange={(e) => setEventForm((p) => ({ ...p, starts_at: e.target.value }))}
            />
            <Field
              label="Selesai (opsional)"
              type="datetime-local"
              value={eventForm.ends_at}
              onChange={(e) => setEventForm((p) => ({ ...p, ends_at: e.target.value }))}
            />
            <Field
              label="Kuota"
              type="number"
              min="1"
              required
              value={eventForm.quota}
              onChange={(e) => setEventForm((p) => ({ ...p, quota: e.target.value }))}
            />
            <Field
              label="Link grup WhatsApp (opsional)"
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              value={eventForm.whatsapp_url}
              onChange={(e) => setEventForm((p) => ({ ...p, whatsapp_url: e.target.value }))}
            />
            <Field
              label="Catatan kontak / CP"
              placeholder="CP: Humas BEM · 0812-xxxx"
              value={eventForm.contact_note}
              onChange={(e) => setEventForm((p) => ({ ...p, contact_note: e.target.value }))}
            />
          </div>
          <Button type="submit" disabled={saving || orgs.length === 0}>
            {saving ? 'Menyimpan…' : editingEventId ? 'Simpan perubahan' : 'Publikasikan acara'}
          </Button>
        </form>
      )}

      {showForm && tab === 'volunteer' && (
        <form
          onSubmit={saveVolunteer}
          className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
        >
          <p className="text-sm font-semibold text-[var(--ink)]">
            {editingVolunteerId ? 'Edit lowongan relawan' : 'Lowongan relawan baru'}
          </p>
          {openEvents.length === 0 && (
            <p className="text-sm text-amber-700">Buat acara dulu sebelum buka lowongan relawan.</p>
          )}
          <Field
            label="Judul"
            required
            value={volForm.title}
            onChange={(e) => setVolForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Field
            as="textarea"
            label="Deskripsi"
            rows={3}
            value={volForm.description}
            onChange={(e) => setVolForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1.5 block font-medium">Terkait acara</span>
              <select
                required
                className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={volForm.event_id}
                onChange={(e) => setVolForm((p) => ({ ...p, event_id: e.target.value }))}
              >
                <option value="">Pilih acara</option>
                {volunteerEventOptions.map((ev) => (
                  <option key={ev.id} value={ev.dbId || ev.id}>
                    {ev.title}
                    {ev.status === 'closed' ? ' (ditutup)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Lokasi"
              required
              value={volForm.location}
              onChange={(e) => setVolForm((p) => ({ ...p, location: e.target.value }))}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Penyelenggara</span>
              <select
                required
                className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={volForm.organization_id}
                onChange={(e) => setVolForm((p) => ({ ...p, organization_id: e.target.value }))}
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
              label="Waktu"
              type="datetime-local"
              required
              value={volForm.starts_at}
              onChange={(e) => setVolForm((p) => ({ ...p, starts_at: e.target.value }))}
            />
            <Field
              label="Kuota"
              type="number"
              min="1"
              required
              value={volForm.quota}
              onChange={(e) => setVolForm((p) => ({ ...p, quota: e.target.value }))}
            />
            <Field
              label="Link WhatsApp (opsional)"
              type="url"
              value={volForm.whatsapp_url}
              onChange={(e) => setVolForm((p) => ({ ...p, whatsapp_url: e.target.value }))}
            />
            <Field
              label="Catatan kontak / CP"
              value={volForm.contact_note}
              onChange={(e) => setVolForm((p) => ({ ...p, contact_note: e.target.value }))}
            />
          </div>
          <Button type="submit" disabled={saving || openEvents.length === 0 || orgs.length === 0}>
            {saving
              ? 'Menyimpan…'
              : editingVolunteerId
                ? 'Simpan perubahan'
                : 'Publikasikan lowongan'}
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {loading && (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
            Memuat…
          </p>
        )}

        {!loading &&
          tab === 'event' &&
          filteredEvents.map((ev) => {
            const open = openId === ev.id
            const showingSignups =
              signupOpen?.kind === 'event' && signupOpen?.id === (ev.dbId || ev.id)
            const when = relativeStartsLabel(ev.startsAt)
            const linkedVolunteers = volunteerJobsForEvent(volunteers, ev)
            return (
              <CommunityCard
                key={ev.id}
                open={open}
                onToggle={() => toggleCard(ev.id)}
                badgeTone={ev.status === 'closed' ? 'expired' : 'available'}
                badgeLabel={ev.status === 'closed' ? 'Ditutup' : 'Terbuka'}
                timeLabel={when}
                title={ev.title}
                subtitle={`${ev.organizer} · ${ev.registered}/${ev.quota} peserta · ${formatDateTime(ev.startsAt)}`}
                metaExtra={
                  linkedVolunteers.length > 0
                    ? `Relawan: ${linkedVolunteers.length} lowongan`
                    : null
                }
              >
                <p className="text-sm leading-relaxed text-[var(--ink)]">
                  {ev.description || 'Tidak ada deskripsi.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <MetaPill label="Lokasi" value={ev.location || '—'} />
                  <MetaPill label="Mulai" value={formatDateTime(ev.startsAt)} />
                  {ev.endsAt && <MetaPill label="Selesai" value={formatDateTime(ev.endsAt)} />}
                  {ev.contactNote && <MetaPill label="Kontak" value={ev.contactNote} />}
                </div>
                {ev.whatsappUrl && (
                  <a
                    href={ev.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-[var(--forest)] underline"
                  >
                    Grup WhatsApp
                  </a>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEditEvent(ev)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openSignups('event', ev.dbId || ev.id, ev.title, ev.id)}
                  >
                    Pendaftar ({ev.registered})
                  </Button>
                  {ev.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => closeEvent(ev.dbId || ev.id)}
                    >
                      Tutup
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeEvent(ev.dbId || ev.id)}>
                    Hapus
                  </Button>
                </div>
                {showingSignups && (
                  <SignupPanel
                    kind="event"
                    loading={signupLoading}
                    signups={signups}
                    onApprove={(id) => updateSignupStatus(id, 'approved')}
                    onReject={(id) => updateSignupStatus(id, 'rejected')}
                  />
                )}
              </CommunityCard>
            )
          })}

        {!loading &&
          tab === 'volunteer' &&
          filteredVolunteers.map((v) => {
            const open = openId === v.id
            const showingSignups =
              signupOpen?.kind === 'volunteer' && signupOpen?.id === (v.dbId || v.id)
            const when = relativeStartsLabel(v.startsAt)
            return (
              <CommunityCard
                key={v.id}
                open={open}
                onToggle={() => toggleCard(v.id)}
                badgeTone={v.status === 'closed' ? 'expired' : 'borrow'}
                badgeLabel={v.status === 'closed' ? 'Ditutup' : 'Terbuka'}
                timeLabel={when}
                title={v.title}
                subtitle={`${v.organizer} · ${v.signedUp}/${v.quota} relawan · ${formatDateTime(v.startsAt)}`}
              >
                <p className="text-sm leading-relaxed text-[var(--ink)]">
                  {v.description || 'Tidak ada deskripsi.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <MetaPill label="Acara terkait" value={eventTitle(events, v.eventId)} />
                  <MetaPill label="Lokasi" value={v.location || '—'} />
                  <MetaPill label="Waktu" value={formatDateTime(v.startsAt)} />
                  {v.contactNote && <MetaPill label="Kontak" value={v.contactNote} />}
                </div>
                {v.whatsappUrl && (
                  <a
                    href={v.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-[var(--forest)] underline"
                  >
                    Grup WhatsApp
                  </a>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEditVolunteer(v)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openSignups('volunteer', v.dbId || v.id, v.title, v.id)}
                  >
                    Pendaftar ({v.signedUp})
                  </Button>
                  {v.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => closeVolunteer(v.dbId || v.id)}
                    >
                      Tutup
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeVolunteer(v.dbId || v.id)}>
                    Hapus
                  </Button>
                </div>
                {showingSignups && (
                  <SignupPanel
                    kind="volunteer"
                    loading={signupLoading}
                    signups={signups}
                    onApprove={(id) => updateSignupStatus(id, 'approved')}
                    onReject={(id) => updateSignupStatus(id, 'rejected')}
                  />
                )}
              </CommunityCard>
            )
          })}

        {!loading && activeList.length === 0 && (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] py-10 text-center text-sm text-[var(--muted)]">
            {totalCount === 0
              ? tab === 'event'
                ? 'Belum ada acara. Klik Tambah di atas.'
                : 'Belum ada lowongan. Klik Tambah di atas.'
              : 'Tidak ada hasil untuk filter ini.'}
          </p>
        )}
      </div>
    </div>
  )
}

function CommunityCard({
  open,
  onToggle,
  badgeTone,
  badgeLabel,
  timeLabel,
  title,
  subtitle,
  metaExtra,
  children,
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white transition ${
        open ? 'border-[var(--forest)]/40 shadow-sm' : 'border-[var(--line)]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={badgeTone}>{badgeLabel}</Badge>
            {timeLabel && (
              <span className="text-xs font-medium text-[var(--muted)]">{timeLabel}</span>
            )}
          </div>
          <h3 className="mt-1.5 font-display text-base font-semibold text-[var(--ink)]">{title}</h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
          {metaExtra && <p className="mt-1 text-xs font-medium text-[var(--forest)]">{metaExtra}</p>}
        </div>
        {open ? (
          <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
        ) : (
          <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
        )}
      </button>
      {open && <div className="border-t border-[var(--line)] bg-[#f8faf9] px-4 py-3">{children}</div>}
    </div>
  )
}

function SignupPanel({ kind, loading, signups, onApprove, onReject }) {
  return (
    <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3">
      <p className="text-sm font-semibold">
        {kind === 'event' ? 'Daftar pendaftar acara' : 'Daftar pendaftar relawan'}
      </p>
      {loading ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Memuat…</p>
      ) : signups.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Belum ada pendaftar.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {signups.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8faf9] px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{s.userName}</span>
                <span className="text-[var(--muted)]"> · {s.userEmail}</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    s.status === 'approved'
                      ? 'approved'
                      : s.status === 'rejected'
                        ? 'expired'
                        : 'pending'
                  }
                >
                  {s.status === 'approved'
                    ? 'Disetujui'
                    : s.status === 'rejected'
                      ? 'Ditolak'
                      : kind === 'event'
                        ? 'Terdaftar'
                        : 'Menunggu'}
                </Badge>
                {kind === 'volunteer' && s.status === 'pending' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => onApprove(s.id)}>
                      Setujui
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onReject(s.id)}>
                      Tolak
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
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

function MetaPill({ label, value }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[var(--line)]">
      <span className="text-[var(--muted)]">{label}</span>{' '}
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </span>
  )
}
