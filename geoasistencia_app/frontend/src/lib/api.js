import { loadSession, saveSession, clearSession } from './storage'

export function getSession() {
  return loadSession()
}

export function setSession(next) {
  saveSession(next)
}

export function logout() {
  clearSession()
}

function authHeaders() {
  const s = loadSession()
  if (!s?.token) return {}
  return { Authorization: `Bearer ${s.token}` }
}

export async function apiGet(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...authHeaders()
    }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

export async function apiPost(path, body, opts = {}) {
  const res = await fetch(path, {
    method: 'POST',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...authHeaders()
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

export async function apiPut(path, body, opts = {}) {
  const res = await fetch(path, {
    method: 'PUT',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...authHeaders()
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

export async function apiGetWithToken(path, token) {
  const res = await fetch(path, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}
