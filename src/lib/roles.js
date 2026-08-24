export function isStudent(role) {
  return !role || role === 'student' || role === 'mahasiswa'
}

export function isCampusAdmin(role) {
  return role === 'campus_admin'
}

export function isSuperAdmin(role) {
  return role === 'super_admin'
}

export function isAdmin(role) {
  return isCampusAdmin(role) || isSuperAdmin(role)
}

export function homePathForRole(role) {
  if (isSuperAdmin(role)) return '/admin/super'
  if (isCampusAdmin(role)) return '/admin/campus'
  return '/app'
}

export function roleLabel(role) {
  const map = {
    student: 'Mahasiswa',
    mahasiswa: 'Mahasiswa',
    campus_admin: 'Admin Kampus',
    super_admin: 'Super Admin',
  }
  return map[role] || role
}
