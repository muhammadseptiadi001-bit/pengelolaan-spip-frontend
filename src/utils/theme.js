export function ambilTema() {
  return localStorage.getItem("spipTema") || "light"
}

export function setTema(tema) {
  localStorage.setItem("spipTema", tema)
  if (tema === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
}

export function toggleTema() {
  const temaSekarang = ambilTema()
  const temaBaru = temaSekarang === "light" ? "dark" : "light"
  setTema(temaBaru)
  return temaBaru
}

export function terapkanTemaAwal() {
  setTema(ambilTema())
}