import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { currentUserSeed } from '../data/mock'
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiUpdateMe,
  apiUpdatePassword,
  apiRegister,
  apiRequestRegisterOtp,
  apiResendRegisterOtp,
  apiVerifyRegisterOtp,
  getAuthToken,
  setAuthToken,
  USE_API,
} from '../lib/api'

const AuthContext = createContext(null)
const STORAGE_KEY = 'campusnexa_user'

function readStoredUser() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const [booting, setBooting] = useState(() => {
    if (!USE_API) return false
    // Kalau sudah ada sesi tersimpan, jangan blok layar — refresh di background
    return !(readStoredUser() && getAuthToken())
  })

  useEffect(() => {
    if (!USE_API) return
    const token = getAuthToken()
    if (!token) {
      // Jangan biarkan user "nyangkut" di storage tanpa token
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      setUser(null)
      setBooting(false)
      return
    }
    // Ada user cached → biarkan dashboard bootstrap yang refresh (hemat 1 request lambat)
    if (readStoredUser()) {
      setBooting(false)
      return
    }
    let cancelled = false
    apiMe()
      .then((u) => {
        if (cancelled) return
        const store = localStorage.getItem('campusnexa_token') ? localStorage : sessionStorage
        store.setItem(STORAGE_KEY, JSON.stringify(u))
        setUser(u)
      })
      .catch(() => {
        if (cancelled) return
        setAuthToken(null)
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_KEY)
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => {
    function persist(next, { remember = true } = {}) {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      const store = remember ? localStorage : sessionStorage
      store.setItem(STORAGE_KEY, JSON.stringify(next))
      setUser(next)
      return next
    }

    async function login({ email, password, name, remember = true }) {
      if (USE_API) {
        const data = await apiLogin({
          email,
          password: password || 'campusloop',
          remember,
        })
        return persist(data.user, { remember })
      }
      const next = {
        ...currentUserSeed,
        email: email || currentUserSeed.email,
        name: name || currentUserSeed.name,
        impact: { ...currentUserSeed.impact },
      }
      return persist(next, { remember })
    }

    async function register(payload) {
      if (USE_API) {
        const data = await apiRegister({
          name: payload.name || 'Mahasiswa Baru',
          email: payload.email,
          password: payload.password || 'campusloop',
          university: payload.university,
          student_id: payload.studentId || payload.student_id,
          faculty: payload.faculty,
        })
        return persist(data.user)
      }
      return login(payload)
    }

    async function requestRegisterOtp(payload) {
      if (!USE_API) {
        return { email: payload.email, message: 'Mode demo — lanjutkan ke OTP apa saja.' }
      }
      return apiRequestRegisterOtp({
        name: payload.name || 'Mahasiswa Baru',
        email: payload.email,
        password: payload.password || 'campusloop',
        university: payload.university,
        student_id: payload.studentId || payload.student_id,
        faculty: payload.faculty,
      })
    }

    async function resendRegisterOtp(email) {
      if (!USE_API) return { email, message: 'Mode demo' }
      return apiResendRegisterOtp(email)
    }

    async function verifyRegisterOtp({ email, code }) {
      if (USE_API) {
        const data = await apiVerifyRegisterOtp({ email, code })
        return persist(data.user)
      }
      return login({ email, name: 'Mahasiswa Baru' })
    }

    function logout() {
      // Hapus sesi lokal segera; jangan tunggu API (sering lambat/error → UI tetap “login”)
      const token = getAuthToken()
      setAuthToken(null)
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      setUser(null)

      if (USE_API && token) {
        void apiLogout(token).catch(() => {})
      }
    }

    function updateImpact(delta) {
      setUser((prev) => {
        if (!prev) return prev
        const next = {
          ...prev,
          impact: {
            itemsSaved: (prev.impact?.itemsSaved || 0) + (delta.itemsSaved || 0),
            foodRescuedKg: +(
              (prev.impact?.foodRescuedKg || 0) + (delta.foodRescuedKg || 0)
            ).toFixed(1),
            wasteReducedKg: +(
              (prev.impact?.wasteReducedKg || 0) + (delta.wasteReducedKg || 0)
            ).toFixed(1),
            moneySaved: (prev.impact?.moneySaved || 0) + (delta.moneySaved || 0),
          },
        }
        const store = localStorage.getItem('campusnexa_token') ? localStorage : sessionStorage
        store.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }

    async function refreshUser() {
      if (!USE_API) return user
      if (!getAuthToken()) return null
      const u = await apiMe()
      // Jangan restore user kalau sudah logout saat request masih jalan
      if (!getAuthToken()) return null
      return persist(u)
    }

    async function updateProfile(payload) {
      if (USE_API) {
        const u = await apiUpdateMe(payload)
        if (!getAuthToken()) return null
        return persist(u)
      }
      const next = {
        ...user,
        ...payload,
        avatar:
          payload.name
            ? String(payload.name)
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : user?.avatar,
      }
      return persist(next)
    }

    async function changePassword({ currentPassword, password, passwordConfirmation }) {
      if (!USE_API) {
        throw new Error('API diperlukan')
      }
      return apiUpdatePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
    }

    function applyUser(next) {
      if (!next || !getAuthToken()) return null
      return persist(next)
    }

    return {
      user,
      booting,
      isAuthenticated: Boolean(user),
      login,
      register,
      requestRegisterOtp,
      resendRegisterOtp,
      verifyRegisterOtp,
      logout,
      updateImpact,
      refreshUser,
      updateProfile,
      changePassword,
      applyUser,
      useApi: USE_API,
    }
  }, [user, booting])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
