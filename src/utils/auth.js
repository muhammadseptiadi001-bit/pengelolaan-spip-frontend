export function simpanLogin(token, user) {
  localStorage.setItem("spipToken", token)
  localStorage.setItem("spipUser", JSON.stringify(user))
}

export function ambilUser() {
  const data = localStorage.getItem("spipUser")
  return data ? JSON.parse(data) : null
}

export function ambilToken() {
  return localStorage.getItem("spipToken")
}

export function logout() {
  localStorage.removeItem("spipToken")
  localStorage.removeItem("spipUser")
}

export function sudahLogin() {
  return ambilToken() !== null
}