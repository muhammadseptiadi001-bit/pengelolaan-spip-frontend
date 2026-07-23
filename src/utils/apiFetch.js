import { ambilToken, logout } from './auth'

export async function apiFetch(url, options = {}) {
  const token = ambilToken()

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    logout()
    window.location.href = "/login"
    throw new Error("Sesi login sudah berakhir. Silakan login ulang.")
  }

  return response
}