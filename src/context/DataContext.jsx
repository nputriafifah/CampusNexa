import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  borrowRequests as seedBorrows,
  foods as seedFoods,
  impactStats as seedImpact,
  items as seedItems,
  notifications as seedNotifications,
} from '../data/mock'
import { campusApi, getAuthToken, USE_API } from '../lib/api'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)
const STORAGE_KEY = 'campusnexa_data_v2'

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString()
}

function withFreshFoodTimes(foods) {
  return foods.map((f, i) => {
    if (f.status !== 'available') return f
    return {
      ...f,
      pickupUntil: f.pickupUntil || hoursFromNow(2 + i * 1.5),
      remaining: f.remaining ?? f.quantity,
      maxClaimPerUser: f.maxClaimPerUser ?? 2,
      claimedBy: f.claimedBy ?? {},
    }
  })
}

function defaultState() {
  return {
    items: seedItems.map((item) => ({
      ...item,
      interests: item.interests ?? [],
      donationClaim: item.donationClaim ?? null,
    })),
    // Mode API: jangan isi seed mock — nanti flash lalu hilang saat bootstrap
    foods: USE_API ? [] : withFreshFoodTimes(seedFoods),
    borrows: seedBorrows.map((b) => ({
      ...b,
      borrowerId: b.borrowerId ?? 'u1',
      ownerId: b.ownerId ?? (b.itemId === 'i5' ? 'org1' : 'u3'),
      reminderSent: b.reminderSent ?? false,
    })),
    notifications: seedNotifications,
    campusImpact: { ...seedImpact.campus },
    weekly: seedImpact.weekly.map((d) => ({ ...d })),
    interests: [],
    favorites: [],
  }
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    const merged = { ...defaultState(), ...parsed }
    if (USE_API) {
      // Hanya pakai cache lokal kalau sudah data API (punya dbId)
      const cached = Array.isArray(parsed.foods) ? parsed.foods : []
      merged.foods = cached.some((f) => f?.dbId != null) ? cached : []
    } else if (Array.isArray(merged.foods)) {
      merged.foods = withFreshFoodTimes(merged.foods)
    }
    return merged
  } catch {
    return defaultState()
  }
}

function itemKey(id) {
  return String(id ?? '').replace(/^i/, '')
}

export function DataProvider({ children }) {
  const { user, isAuthenticated, applyUser, useApi } = useAuth()
  const [state, setState] = useState(loadLocalState)
  const [loading, setLoading] = useState(false)
  const applyUserRef = useRef(applyUser)
  applyUserRef.current = applyUser
  const bootstrappedRef = useRef(false)

  const refreshAll = useCallback(async ({ silent = false } = {}) => {
    if (!useApi || !isAuthenticated || !getAuthToken()) return
    if (!silent) setLoading(true)
    try {
      const data = await campusApi.bootstrap()
      if (!getAuthToken()) return
      setState((prev) => ({
        ...prev,
        items: data.items,
        foods: data.foods,
        borrows: [...(data.borrows?.mine || []), ...(data.borrows?.incoming || [])],
        notifications: data.notifications,
        favorites: Array.isArray(data.favorites) ? data.favorites.map(String) : prev.favorites,
        campusImpact: data.impact?.campus,
        weekly: data.impact?.weekly,
        interests: prev.interests,
      }))
      // Jangan selalu applyUser — itu memicu re-render + loop bootstrap
      if (data.user && applyUserRef.current) {
        const next = data.user
        const prev = (() => {
          try {
            return JSON.parse(localStorage.getItem('campusnexa_user') || 'null')
          } catch {
            return null
          }
        })()
        if (
          !prev ||
          prev.id !== next.id ||
          prev.impact?.itemsSaved !== next.impact?.itemsSaved ||
          prev.impact?.foodRescuedKg !== next.impact?.foodRescuedKg ||
          prev.name !== next.name ||
          prev.organization !== next.organization ||
          prev.organizationId !== next.organizationId
        ) {
          applyUserRef.current(next)
        }
      }
    } catch (err) {
      console.error('Failed to refresh API data', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [useApi, isAuthenticated])

  const mergeFoodIntoState = useCallback((updated) => {
    if (!updated) return
    setState((prev) => {
      const idx = prev.foods.findIndex(
        (f) =>
          f.id === updated.id ||
          String(f.dbId) === String(updated.dbId) ||
          f.id === `f${updated.dbId}` ||
          String(f.dbId) === String(updated.id || '').replace(/^f/, ''),
      )
      if (idx === -1) {
        return { ...prev, foods: [updated, ...prev.foods] }
      }
      const foods = prev.foods.slice()
      foods[idx] = { ...foods[idx], ...updated }
      return { ...prev, foods }
    })
  }, [])

  const refreshFoods = useCallback(async () => {
    if (!useApi || !isAuthenticated || !getAuthToken()) return
    try {
      const list = await campusApi.foods()
      if (!getAuthToken()) return
      setState((prev) => ({ ...prev, foods: Array.isArray(list) ? list : prev.foods }))
    } catch (err) {
      console.error('Failed to refresh foods', err)
    }
  }, [useApi, isAuthenticated])

  // Bootstrap sekali saat login (mahasiswa saja — admin punya endpoint sendiri)
  useEffect(() => {
    if (!useApi || !isAuthenticated) {
      bootstrappedRef.current = false
      return
    }
    const role = user?.role
    if (role === 'campus_admin' || role === 'super_admin') {
      bootstrappedRef.current = true
      return
    }
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    refreshAll()
  }, [useApi, isAuthenticated, refreshAll, user?.role])

  // Favorit: lokal hanya kalau mode demo (tanpa API)
  useEffect(() => {
    if (useApi || !user?.id) return
    try {
      const raw = localStorage.getItem(`campusnexa_favs_${user.id}`)
      const favorites = raw ? JSON.parse(raw) : []
      setState((prev) => ({ ...prev, favorites: Array.isArray(favorites) ? favorites : [] }))
    } catch {
      setState((prev) => ({ ...prev, favorites: [] }))
    }
  }, [user?.id, useApi])

  useEffect(() => {
    if (!useApi) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, useApi])

  const value = useMemo(() => {
    async function publishItem(payload) {
      if (useApi) {
        const fd = new FormData()
          Object.entries({
          title: payload.title,
          description: payload.description,
          category: payload.category,
          condition: payload.condition,
          listing_type: payload.listingType,
          price: payload.listingType === 'sell' ? payload.price || 0 : 0,
          looking_for: payload.listingType === 'exchange' ? payload.lookingFor || '' : '',
          location: payload.location,
        }).forEach(([k, v]) => fd.append(k, v ?? ''))
        ;(payload.tags || []).forEach((tag) => fd.append('tags[]', tag))
        if (payload.imageFile) fd.append('image', payload.imageFile)
        else if (payload.image?.startsWith('http')) fd.append('image_url', payload.image)
        const item = await campusApi.createItem(fd)
        setState((prev) => ({ ...prev, items: [item, ...prev.items] }))
        void refreshAll({ silent: true })
        return item
      }
      const item = {
        id: `i${Date.now()}`,
        status: 'available',
        createdAt: new Date().toISOString().slice(0, 10),
        tags: payload.tags || [],
        interests: [],
        donationClaim: null,
        owner: user?.name || 'Anonim',
        ownerId: user?.id || 'u1',
        price: payload.listingType === 'sell' ? Number(payload.price) || 0 : 0,
        lookingFor: payload.listingType === 'exchange' ? payload.lookingFor || '' : null,
        ...payload,
      }
      setState((prev) => ({ ...prev, items: [item, ...prev.items] }))
      return item
    }

    async function sendInterest({ itemId, message }) {
      if (useApi) {
        const row = await campusApi.sendInterest(itemId, message)
        setState((prev) => ({
          ...prev,
          interests: [row, ...prev.interests.filter((i) => i.id !== row.id)],
          items: prev.items.map((i) => {
            const match =
              i.id === itemId ||
              String(i.dbId) === String(itemId) ||
              i.id === `i${itemId}` ||
              i.id === row.itemId
            if (!match) return i
            return {
              ...i,
              interestCount: Number(i.interestCount || 0) + (i.myInterest ? 0 : 1),
              myInterest: true,
            }
          }),
        }))
        void refreshAll({ silent: true })
        return row
      }
      const interest = {
        id: `int${Date.now()}`,
        dbId: Date.now(),
        itemId,
        fromUserId: user?.id || 'u1',
        fromName: user?.name || 'Mahasiswa',
        fromFaculty: user?.faculty || null,
        message,
        createdAt: new Date().toISOString(),
        replies: [],
      }
      setState((prev) => ({
        ...prev,
        interests: [interest, ...prev.interests],
        items: prev.items.map((i) => {
          const match = i.id === itemId || String(i.dbId) === String(itemId) || i.id === `i${itemId}`
          if (!match) return i
          return {
            ...i,
            interestCount: Number(i.interestCount || 0) + (i.myInterest ? 0 : 1),
            myInterest: true,
          }
        }),
      }))
      return interest
    }

    async function replyInterest({ interestId, message }) {
      if (useApi) {
        const res = await campusApi.replyInterest(interestId, message)
        return res
      }
      const reply = {
        id: `ir${Date.now()}`,
        interestId,
        fromUserId: user?.id || 'u1',
        fromName: user?.name || 'Mahasiswa',
        message,
        createdAt: new Date().toISOString(),
      }
      setState((prev) => ({
        ...prev,
        interests: prev.interests.map((i) =>
          i.id === interestId || String(i.dbId) === String(interestId)
            ? { ...i, replies: [...(i.replies || []), reply] }
            : i,
        ),
      }))
      return { data: reply }
    }

    async function requestBorrow({ itemId, dueDate }) {
      if (!useApi) {
        throw new Error('API diperlukan untuk pinjam')
      }
      const res = await campusApi.requestBorrow(itemId, dueDate)
      const row = res.data
      const interest = res.interest
      setState((prev) => ({
        ...prev,
        borrows: [row, ...prev.borrows.filter((b) => b.id !== row.id)],
        interests: interest
          ? [interest, ...prev.interests.filter((i) => i.id !== interest.id)]
          : prev.interests,
        items: prev.items.map((i) => {
          const match =
            i.id === itemId ||
            String(i.dbId) === String(itemId) ||
            i.id === `i${itemId}` ||
            i.id === row.itemId
          if (!match) return i
          return {
            ...i,
            status: 'reserved',
            interestCount: Number(i.interestCount || 0) + (i.myInterest ? 0 : 1),
            myInterest: true,
            donationClaim: {
              claimerId: String(user?.id || ''),
              claimerName: user?.name || 'Peminjam',
              status: 'reserved',
            },
          }
        }),
      }))
      void refreshAll({ silent: true })
      return { ...row, interest }
    }

    async function respondBorrow(borrowId, decision) {
      if (!useApi) {
        throw new Error('API diperlukan')
      }
      const row = await campusApi.respondBorrow(borrowId, decision)
      setState((prev) => ({
        ...prev,
        borrows: prev.borrows.map((b) =>
          b.id === borrowId || String(b.id) === String(borrowId) ? { ...b, ...row } : b,
        ),
        items: prev.items.map((i) => {
          const match =
            i.id === row.itemId ||
            String(i.dbId) === itemKey(row.itemId) ||
            i.id === `i${itemKey(row.itemId)}`
          if (!match) return i
          return {
            ...i,
            status: decision === 'approve' ? 'borrowed' : 'available',
          }
        }),
      }))
      void refreshAll({ silent: true })
      return row
    }

    async function returnBorrow(borrowId) {
      if (!useApi) {
        throw new Error('API diperlukan')
      }
      const row = await campusApi.returnBorrow(borrowId)
      setState((prev) => ({
        ...prev,
        borrows: prev.borrows.map((b) =>
          b.id === borrowId || String(b.id) === String(borrowId) ? { ...b, ...row } : b,
        ),
        items: prev.items.map((i) => {
          const match =
            i.id === row.itemId ||
            String(i.dbId) === itemKey(row.itemId) ||
            i.id === `i${itemKey(row.itemId)}`
          if (!match) return i
          return { ...i, status: 'available' }
        }),
      }))
      void refreshAll({ silent: true })
      return row
    }

    async function sendBorrowReminder(borrowId) {
      if (!useApi) {
        throw new Error('API diperlukan')
      }
      const row = await campusApi.remindBorrow(borrowId)
      setState((prev) => ({
        ...prev,
        borrows: prev.borrows.map((b) =>
          b.id === borrowId || String(b.id) === String(borrowId)
            ? { ...b, ...row, reminderSent: true }
            : b,
        ),
      }))
      return row
    }

    async function publishFood(payload) {
      if (useApi) {
        const body = payload.imageFile
          ? {
              title: payload.title,
              description: payload.description,
              quantity: Number(payload.quantity),
              unit: payload.unit || 'porsi',
              max_claim_per_user: Number(payload.maxClaimPerUser) || 2,
              location: payload.location,
              pickup_until: payload.pickupUntil,
              organization: payload.organization || '',
              imageFile: payload.imageFile,
            }
          : {
              title: payload.title,
              description: payload.description,
              quantity: Number(payload.quantity),
              unit: payload.unit || 'porsi',
              max_claim_per_user: Number(payload.maxClaimPerUser) || 2,
              location: payload.location,
              pickup_until: payload.pickupUntil,
              organization: payload.organization,
              image_url: payload.image,
            }
        const food = await campusApi.createFood(body)
        mergeFoodIntoState(food)
        void refreshAll({ silent: true })
        return food
      }
      return null
    }

    async function claimFood(foodId, amount = 1) {
      if (useApi) {
        try {
          const res = await campusApi.claimFood(foodId, amount)
          if (res.data) mergeFoodIntoState(res.data)
          else void refreshFoods()
          return { ok: true, message: res.message, data: res.data }
        } catch (err) {
          return {
            ok: false,
            message: err.response?.data?.message || 'Gagal klaim',
          }
        }
      }
      return { ok: false, message: 'API required' }
    }

    async function cancelFoodClaim(foodId) {
      if (useApi) {
        try {
          const res = await campusApi.cancelFoodClaim(foodId)
          if (res.data) mergeFoodIntoState(res.data)
          else void refreshFoods()
          return { ok: true, message: res.message, data: res.data }
        } catch (err) {
          return {
            ok: false,
            message: err.response?.data?.message || 'Gagal batalkan klaim',
          }
        }
      }
      return { ok: false, message: 'API required' }
    }

    async function claimDonation(itemId) {
      if (useApi) {
        try {
          const res = await campusApi.claimDonation(itemId)
          const updated = res.data
          if (updated) {
            setState((prev) => ({
              ...prev,
              items: prev.items.map((i) =>
                i.id === itemId ||
                String(i.dbId) === String(itemId) ||
                i.id === `i${itemId}` ||
                i.id === updated.id
                  ? { ...i, ...updated }
                  : i,
              ),
            }))
          } else {
            void refreshAll({ silent: true })
          }
          return {
            ok: true,
            message: res.message || 'Klaim berhasil',
            data: updated,
            interest: res.interest,
          }
        } catch (err) {
          return { ok: false, message: err.response?.data?.message || 'Gagal klaim' }
        }
      }
      return { ok: false, message: 'API required' }
    }

    async function confirmDonationHandover(itemId) {
      if (useApi) {
        await campusApi.confirmHandover(itemId)
        void refreshAll({ silent: true })
        return { ok: true }
      }
      return { ok: false }
    }

    async function completeExchange(itemId) {
      if (useApi) {
        await campusApi.updateItemStatus(itemId, 'exchanged')
      }
      setState((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId || String(i.dbId) === String(itemId) || i.id === `i${itemId}`
            ? { ...i, status: 'exchanged' }
            : i,
        ),
      }))
    }

    async function updateItemStatus(itemId, status) {
      if (useApi) {
        await campusApi.updateItemStatus(itemId, status)
      }
      setState((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId || String(i.dbId) === String(itemId) || i.id === `i${itemId}`
            ? { ...i, status }
            : i,
        ),
      }))
    }

    async function deleteItem(itemId) {
      if (useApi) {
        await campusApi.deleteItem(itemId)
      }
      setState((prev) => ({
        ...prev,
        items: prev.items.filter(
          (i) => i.id !== itemId && String(i.dbId) !== String(itemId) && i.id !== `i${itemId}`,
        ),
      }))
    }

    async function markNotifRead(id) {
      if (useApi) {
        await campusApi.markNotifRead(id)
      }
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === id || String(n.dbId) === String(id) ? { ...n, read: true } : n,
        ),
      }))
    }

    async function markAllNotifsRead() {
      if (useApi) {
        await campusApi.markAllNotifsRead()
      }
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
      }))
    }

    function resetDemoData() {
      if (useApi) {
        refreshAll()
        return
      }
      const fresh = defaultState()
      setState(fresh)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    }

    function getItemInterests(itemId) {
      return state.interests.filter((i) => i.itemId === itemId)
    }

    async function toggleFavorite(itemId) {
      const key = itemKey(itemId)
      if (!key) {
        throw new Error('Barang tidak valid')
      }

      function applyLocal(prev) {
        const has = prev.favorites.map(String).includes(key)
        const favorites = has
          ? prev.favorites.filter((id) => String(id) !== key)
          : [...prev.favorites, key]
        try {
          const favKey = `campusnexa_favs_${user?.id || 'guest'}`
          localStorage.setItem(favKey, JSON.stringify(favorites))
        } catch {
          /* ignore */
        }
        return { next: { ...prev, favorites }, favorited: !has }
      }

      if (useApi && getAuthToken()) {
        try {
          const res = await campusApi.toggleFavorite(key)
          const favorites = Array.isArray(res.favorites)
            ? res.favorites.map(String)
            : []
          setState((prev) => ({ ...prev, favorites }))
          try {
            localStorage.setItem(
              `campusnexa_favs_${user?.id || 'guest'}`,
              JSON.stringify(favorites),
            )
          } catch {
            /* ignore */
          }
          return Boolean(res.favorited)
        } catch (err) {
          // Kalau API gagal, tetap simpan lokal biar tombol tidak “mati”
          let favorited = false
          setState((prev) => {
            const { next, favorited: fav } = applyLocal(prev)
            favorited = fav
            return next
          })
          const status = err?.response?.status
          if (status === 401) {
            const e = new Error('Sesi habis. Login lagi ya.')
            e.code = 'AUTH'
            throw e
          }
          return favorited
        }
      }

      let favorited = false
      setState((prev) => {
        const { next, favorited: fav } = applyLocal(prev)
        favorited = fav
        return next
      })
      return favorited
    }

    return {
      ...state,
      loading,
      refreshAll,
      refreshFoods,
      mergeFoodIntoState,
      publishItem,
      updateItemStatus,
      deleteItem,
      sendInterest,
      replyInterest,
      requestBorrow,
      respondBorrow,
      returnBorrow,
      sendBorrowReminder,
      publishFood,
      claimFood,
      cancelFoodClaim,
      claimDonation,
      confirmDonationHandover,
      completeExchange,
      markNotifRead,
      markAllNotifsRead,
      resetDemoData,
      getItemInterests,
      toggleFavorite,
    }
  }, [state, user, useApi, refreshAll, refreshFoods, mergeFoodIntoState, loading])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
