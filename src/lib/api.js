import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 12000,
  headers: {
    Accept: 'application/json',
  },
})

export function setAuthToken(token, { remember = true } = {}) {
  localStorage.removeItem('campusnexa_token')
  sessionStorage.removeItem('campusnexa_token')
  if (!token) return
  const store = remember ? localStorage : sessionStorage
  store.setItem('campusnexa_token', token)
}

export function getAuthToken() {
  return localStorage.getItem('campusnexa_token') || sessionStorage.getItem('campusnexa_token')
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function apiLogin({ email, password, remember = true }) {
  const { data } = await api.post('/login', { email, password })
  setAuthToken(data.token, { remember })
  return data
}

export async function apiRegister(payload) {
  const { data } = await api.post('/register', payload)
  setAuthToken(data.token)
  return data
}

export async function apiRequestRegisterOtp(payload) {
  const { data } = await api.post('/register/request-otp', payload)
  return data
}

export async function apiResendRegisterOtp(email) {
  const { data } = await api.post('/register/resend-otp', { email })
  return data
}

export async function apiVerifyRegisterOtp({ email, code }) {
  const { data } = await api.post('/register/verify-otp', { email, code })
  setAuthToken(data.token)
  return data
}

export async function apiRequestPasswordResetOtp(email) {
  const { data } = await api.post('/password/forgot', { email })
  return data
}

export async function apiResendPasswordResetOtp(email) {
  const { data } = await api.post('/password/resend-otp', { email })
  return data
}

export async function apiResetPasswordWithOtp({ email, code, password, password_confirmation }) {
  const { data } = await api.post('/password/reset', {
    email,
    code,
    password,
    password_confirmation,
  })
  return data
}

export async function apiMe() {
  const { data } = await api.get('/me')
  return data.user
}

export async function apiUpdateMe(payload) {
  const { data } = await api.patch('/me', payload)
  return data.user
}

export async function apiUpdatePassword(payload) {
  const { data } = await api.patch('/me/password', payload)
  return data
}

export async function apiLogout(token) {
  const bearer = token || getAuthToken()
  try {
    await api.post(
      '/logout',
      {},
      bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : undefined,
    )
  } finally {
    setAuthToken(null)
  }
}

export const campusApi = {
  bootstrap: () => api.get('/bootstrap').then((r) => r.data),
  items: (params) => api.get('/items', { params }).then((r) => r.data.data),
  item: (id) => api.get(`/items/${normalizeId(id)}`).then((r) => r.data),
  createItem: (formData) =>
    api.post('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data),
  updateItemStatus: (id, status) =>
    api.patch(`/items/${normalizeId(id)}/status`, { status }).then((r) => r.data.data),
  deleteItem: (id) => api.delete(`/items/${normalizeId(id)}`).then((r) => r.data),
  sendInterest: (id, message) =>
    api.post(`/items/${normalizeId(id)}/interests`, { message }).then((r) => r.data.data),
  toggleFavorite: (id) =>
    api.post(`/items/${normalizeId(id)}/favorite`).then((r) => r.data),
  replyInterest: (interestId, message) =>
    api
      .post(`/interests/${normalizeId(interestId, 'int')}/replies`, { message })
      .then((r) => r.data),

  borrows: () => api.get('/borrows').then((r) => r.data),
  requestBorrow: (itemId, dueDate) =>
    api.post('/borrows', { item_id: itemId, due_date: dueDate }).then((r) => r.data),
  respondBorrow: (id, decision) =>
    api.post(`/borrows/${normalizeId(id, 'b')}/respond`, { decision }).then((r) => r.data.data),
  returnBorrow: (id) =>
    api.post(`/borrows/${normalizeId(id, 'b')}/return`).then((r) => r.data.data),
  remindBorrow: (id) =>
    api.post(`/borrows/${normalizeId(id, 'b')}/remind`).then((r) => r.data.data),

  foods: () => api.get('/foods').then((r) => r.data.data),
  food: (id) => api.get(`/foods/${normalizeId(id, 'f')}`).then((r) => r.data.data),
  createFood: (payload) => {
    const hasFile = payload instanceof FormData || payload?.imageFile
    if (hasFile) {
      const fd =
        payload instanceof FormData
          ? payload
          : (() => {
              const form = new FormData()
              Object.entries(payload).forEach(([k, v]) => {
                if (k === 'imageFile' || v == null || v === '') return
                form.append(k, v)
              })
              if (payload.imageFile) form.append('image', payload.imageFile)
              return form
            })()
      return api
        .post('/foods', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then((r) => r.data.data)
    }
    return api.post('/foods', payload).then((r) => r.data.data)
  },
  claimFood: (id, quantity) =>
    api.post(`/foods/${normalizeId(id, 'f')}/claim`, { quantity }).then((r) => r.data),
  cancelFoodClaim: (id) =>
    api.post(`/foods/${normalizeId(id, 'f')}/cancel-claim`).then((r) => r.data),
  predictFood: (payload) => api.post('/ai/predict-food', payload).then((r) => r.data.data),

  claimDonation: (id) =>
    api.post(`/donations/${normalizeId(id)}/claim`).then((r) => r.data),
  confirmHandover: (id) =>
    api.post(`/donations/${normalizeId(id)}/handover`).then((r) => r.data),

  impact: () => api.get('/impact').then((r) => r.data),
  campusOrganizations: () =>
    api.get('/campus-organizations').then((r) => r.data.data),
  publicCampusStats: () => api.get('/stats/campus').then((r) => r.data.campus),
  notifications: () => api.get('/notifications').then((r) => r.data.data),
  markNotifRead: (id) =>
    api.post(`/notifications/${normalizeId(id, 'n')}/read`).then((r) => r.data.data),
  markAllNotifsRead: () => api.post('/notifications/read-all'),
  analyzeItem: (payload) => api.post('/ai/analyze-item', payload).then((r) => r.data.data),
  categories: () => api.get('/categories').then((r) => r.data.data),
  itemRecommendations: () => api.get('/recommendations/items').then((r) => r.data.data),

  adminOverview: () => api.get('/admin/overview').then((r) => r.data),
  adminCampusSummary: () => api.get('/admin/campus-summary').then((r) => r.data),
  adminUsers: (params) => api.get('/admin/users', { params }).then((r) => r.data.data),
  adminUser: (id) => api.get(`/admin/users/${id}`).then((r) => r.data.data),
  adminUpdateUserRole: (id, role) =>
    api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data.data),
  adminUpdateUserStatus: (id, accountStatus) =>
    api
      .patch(`/admin/users/${id}/status`, { account_status: accountStatus })
      .then((r) => r.data.data),
  adminItems: (params) => api.get('/admin/items', { params }).then((r) => r.data.data),
  adminModerateItem: (id, status) =>
    api.patch(`/admin/items/${normalizeId(id)}/status`, { status }).then((r) => r.data.data),
  adminDeleteItem: (id) => api.delete(`/admin/items/${normalizeId(id)}`).then((r) => r.data),
  adminFoods: (params) => api.get('/admin/foods', { params }).then((r) => r.data.data),
  adminCreateFood: (payload) =>
    payload instanceof FormData
      ? api
          .post('/admin/foods', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
          .then((r) => r.data.data)
      : api.post('/admin/foods', payload).then((r) => r.data.data),
  adminUpdateFood: (id, payload) =>
    payload instanceof FormData
      ? api
          .patch(`/admin/foods/${normalizeId(id, 'f')}`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          .then((r) => r.data.data)
      : api.patch(`/admin/foods/${normalizeId(id, 'f')}`, payload).then((r) => r.data.data),
  adminModerateFood: (id, status) =>
    api.patch(`/admin/foods/${normalizeId(id, 'f')}/status`, { status }).then((r) => r.data.data),
  adminDeleteFood: (id) =>
    api.delete(`/admin/foods/${normalizeId(id, 'f')}`).then((r) => r.data),
  adminOrganizations: (params) =>
    api.get('/admin/organizations', { params }).then((r) => r.data.data),
  adminOrganization: (id) => api.get(`/admin/organizations/${id}`).then((r) => r.data.data),
  adminCreateOrganization: (payload) =>
    api.post('/admin/organizations', payload).then((r) => r.data.data),
  adminUpdateOrganization: (id, payload) =>
    api.patch(`/admin/organizations/${id}`, payload).then((r) => r.data.data),
  adminDeleteOrganization: (id) =>
    api.delete(`/admin/organizations/${id}`).then((r) => r.data),
  adminAnnouncements: (params) =>
    api.get('/admin/announcements', { params }).then((r) => r.data.data),
  adminCreateAnnouncement: (payload) =>
    api.post('/admin/announcements', payload).then((r) => r.data.data),
  adminUpdateAnnouncement: (id, payload) =>
    api.patch(`/admin/announcements/${id}`, payload).then((r) => r.data.data),
  adminDeleteAnnouncement: (id) =>
    api.delete(`/admin/announcements/${id}`).then((r) => r.data),
  announcements: () => api.get('/announcements').then((r) => r.data.data),
  adminCommunity: () => api.get('/admin/community').then((r) => r.data.data),
  adminCreateEvent: (payload) =>
    api.post('/admin/community/events', payload).then((r) => r.data.data),
  adminUpdateEvent: (id, payload) =>
    api.patch(`/admin/community/events/${normalizeId(id, 'e')}`, payload).then((r) => r.data.data),
  adminDeleteEvent: (id) =>
    api.delete(`/admin/community/events/${normalizeId(id, 'e')}`).then((r) => r.data),
  adminEventRegistrations: (id) =>
    api
      .get(`/admin/community/events/${normalizeId(id, 'e')}/registrations`)
      .then((r) => r.data.data),
  adminCreateVolunteer: (payload) =>
    api.post('/admin/community/volunteers', payload).then((r) => r.data.data),
  adminUpdateVolunteer: (id, payload) =>
    api
      .patch(`/admin/community/volunteers/${normalizeId(id, 'v')}`, payload)
      .then((r) => r.data.data),
  adminDeleteVolunteer: (id) =>
    api.delete(`/admin/community/volunteers/${normalizeId(id, 'v')}`).then((r) => r.data),
  adminVolunteerSignups: (id) =>
    api
      .get(`/admin/community/volunteers/${normalizeId(id, 'v')}/signups`)
      .then((r) => r.data.data),
  adminUpdateVolunteerSignup: (id, status) =>
    api
      .patch(`/admin/community/volunteer-signups/${id}`, { status })
      .then((r) => r.data.data),
  adminUniversities: (params) =>
    api.get('/admin/universities', { params }).then((r) => r.data.data),
  adminCreateUniversity: (payload) =>
    api.post('/admin/universities', payload).then((r) => r.data.data),
  adminUpdateUniversity: (id, payload) =>
    api.patch(`/admin/universities/${id}`, payload).then((r) => r.data.data),
  adminCreateCampusAdmin: (payload) =>
    api.post('/admin/campus-admins', payload).then((r) => r.data.data),
  adminCampusAdmins: (params) =>
    api.get('/admin/campus-admins', { params }).then((r) => r.data.data),
  adminUpdateCampusAdmin: (id, payload) =>
    api.patch(`/admin/campus-admins/${id}`, payload).then((r) => r.data.data),
  adminResetCampusAdminPassword: (id, payload) =>
    api.post(`/admin/campus-admins/${id}/reset-password`, payload).then((r) => r.data),
  adminDeleteCampusAdmin: (id) =>
    api.delete(`/admin/campus-admins/${id}`).then((r) => r.data),
  adminDeleteUniversity: (id) =>
    api.delete(`/admin/universities/${id}`).then((r) => r.data),
  adminCategories: (params) =>
    api.get('/admin/categories', { params }).then((r) => r.data.data),
  adminCreateCategory: (payload) =>
    api.post('/admin/categories', payload).then((r) => r.data.data),
  adminUpdateCategory: (id, payload) =>
    api.patch(`/admin/categories/${id}`, payload).then((r) => r.data.data),
  adminDeleteCategory: (id) =>
    api.delete(`/admin/categories/${id}`).then((r) => r.data),
  adminAiSettings: () => api.get('/admin/ai-settings').then((r) => r.data.data),
  adminUpdateAiSettings: (payload) =>
    api.patch('/admin/ai-settings', payload).then((r) => r.data.data),
  adminNationalAnalytics: () =>
    api
      .get('/admin/national-analytics', { timeout: 30000 })
      .then((r) => r.data.data),

  community: () => api.get('/community').then((r) => r.data),
  communityEvent: (id) =>
    api.get(`/community/events/${normalizeId(id, 'e')}`).then((r) => r.data.data),
  communityVolunteer: (id) =>
    api.get(`/community/volunteers/${normalizeId(id, 'v')}`).then((r) => r.data.data),
  registerEvent: (id) =>
    api.post(`/community/events/${normalizeId(id, 'e')}/register`).then((r) => r.data),
  cancelEvent: (id) =>
    api.post(`/community/events/${normalizeId(id, 'e')}/cancel`).then((r) => r.data),
  signupVolunteer: (id) =>
    api.post(`/community/volunteers/${normalizeId(id, 'v')}/signup`).then((r) => r.data),
  cancelVolunteer: (id) =>
    api.post(`/community/volunteers/${normalizeId(id, 'v')}/cancel`).then((r) => r.data),
}

function normalizeId(id, prefix = 'i') {
  if (typeof id === 'number') return id
  const raw = String(id)
  if (/^\d+$/.test(raw)) return raw
  return raw.replace(new RegExp(`^${prefix}`), '')
}

export const USE_API = Boolean(import.meta.env.VITE_API_URL || true)
