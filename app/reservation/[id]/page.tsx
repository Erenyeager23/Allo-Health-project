"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

type ReservationView = {
  id: string
  productName: string
  warehouseName: string
  qty: number
  status: string
  expiresAt: string
}

export default function ReservationPage() {
  const params = useParams()
  const id = params?.id
  const [reservation, setReservation] = useState<ReservationView | null>(null)
  const [remaining, setRemaining] = useState(0)

  async function load() {
    const res = await fetch(`/api/reservations/${id}`)
    if (res.status !== 200) {
      alert(`Error ${res.status}`)
      return
    }
    const data = await res.json()
    setReservation(data)
    const ms = new Date(data.expiresAt).getTime() - Date.now()
    setRemaining(Math.max(0, Math.floor(ms / 1000)))
  }

  useEffect(() => { load(); const iv = setInterval(() => {
    setRemaining(r => Math.max(0, r - 1))
  }, 1000); return () => clearInterval(iv) }, [id])

  async function confirmIt() {
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
    if (res.status === 200) {
      alert('Confirmed')
      load()
    } else if (res.status === 410) {
      alert('Reservation expired')
      load()
    } else {
      alert('Failed to confirm')
    }
  }

  async function releaseIt() {
    const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
    if (res.ok) {
      alert('Released')
      load()
    } else {
      alert('Failed to release')
    }
  }

  if (!reservation) return <div>Loading...</div>

  return (
    <div>
      <h2>Reservation</h2>
      <div>Product: {reservation.productName}</div>
      <div>Warehouse: {reservation.warehouseName}</div>
      <div>Qty: {reservation.qty}</div>
      <div>Status: {reservation.status}</div>
      <div>Expires in: {remaining}s</div>
      <div style={{ marginTop: 12 }}>
        {reservation.status === 'pending' && (
          <>
            <button onClick={confirmIt}>Confirm purchase</button>
            <button onClick={releaseIt} style={{ marginLeft: 8 }}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}
