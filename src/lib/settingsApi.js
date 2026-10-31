import { getAmplifySession } from './amplify'

const baseUrl = String(import.meta.env.VITE_PROFILE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://4hu7xlhp0k.execute-api.ap-southeast-2.amazonaws.com').replace(/\/$/, '')

async function apiRequest(path, method = 'GET', body) {
  const session = await getAmplifySession()
  const token = session.tokens?.accessToken?.toString()

  if (!token) {
    throw new Error('Your session is unavailable. Please sign in again.')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  const text = await response.text()
  let payload

  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null
      ? payload.error || payload.message || JSON.stringify(payload)
      : payload
    throw new Error(`${method} ${path} failed (${response.status})${detail ? `: ${detail}` : ''}`)
  }

  return payload
}

export function getProfile() {
  return apiRequest('/demo')
}

export function updateProfile(profile) {
  return apiRequest('/demo', 'PATCH', {
    full_name: profile.name.trim() || null,
    phone: profile.phone.trim() || null,
    preferred_currency: profile.currency,
  })
}

export function inviteUser(email, role) {
  return apiRequest('/admin/invite-user', 'POST', { email: email.trim(), role })
}

export function listUsers() {
  return apiRequest('/admin/users')
}

export async function getCurrentUserRole() {
  const session = await getAmplifySession()
  const groups = session.tokens?.accessToken?.payload?.['cognito:groups']
  return Array.isArray(groups) && groups.some((group) => String(group).toLowerCase() === 'admin')
    ? 'admin'
    : 'user'
}
