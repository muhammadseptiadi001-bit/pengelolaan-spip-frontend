let daftarListener = []

export function tampilkanToast(pesan, tipe = "sukses") {
  const id = Date.now() + Math.random()
  daftarListener.forEach((fn) => fn({ id, pesan, tipe }))
}

export function subscribeToast(fn) {
  daftarListener.push(fn)
  return () => {
    daftarListener = daftarListener.filter((listener) => listener !== fn)
  }
}