import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import { subscribeToast } from '../utils/toast'

const GAYA_TIPE = {
  sukses: { bg: "bg-green-600", ikon: CheckCircle2 },
  gagal: { bg: "bg-red-600", ikon: XCircle },
}

function ToastContainer() {
  const [daftarToast, setDaftarToast] = useState([])

  useEffect(() => {
    const unsubscribe = subscribeToast((toastBaru) => {
      setDaftarToast((prev) => [...prev, toastBaru])
      setTimeout(() => {
        setDaftarToast((prev) => prev.filter((t) => t.id !== toastBaru.id))
      }, 3500)
    })
    return unsubscribe
  }, [])

  function tutupToast(id) {
    setDaftarToast((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[90vw] max-w-sm">
      <AnimatePresence>
        {daftarToast.map((toast) => {
          const gaya = GAYA_TIPE[toast.tipe] || GAYA_TIPE.sukses
          const Ikon = gaya.ikon
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50 }}
              className={`${gaya.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2`}
            >
              <Ikon size={20} className="shrink-0" />
              <p className="text-sm flex-1">{toast.pesan}</p>
              <button onClick={() => tutupToast(toast.id)}>
                <X size={16} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default ToastContainer