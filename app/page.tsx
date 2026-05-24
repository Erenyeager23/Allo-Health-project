"use client"
import { useEffect, useState } from "react"

type StockView = { warehouseId: string; warehouseName: string; available: number }
type ProductView = { id: string; name: string; sku: string; stocks: StockView[] }

export default function Page() {
  const [products, setProducts] = useState<ProductView[]>([])

  async function load() {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data)
  }

  useEffect(() => { load() }, [])

  async function reserve(productId: string, warehouseId: string) {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId, warehouseId, qty: 1 })
    })
    if (res.status === 201) {
      const data = await res.json()
      window.location.href = `/reservation/${data.id}`
    } else {
      const body = await res.text()
      alert(`Failed: ${res.status} - ${body}`)
      load()
    }
  }

  return (
    <div>
      <h2>Products</h2>
      <div>
        {products.map(p => (
          <div key={p.id} style={{ border: '1px solid #eee', padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{p.name}</strong>
                <div>{p.sku}</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              {p.stocks.map(s => (
                <div key={s.warehouseId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>{s.warehouseName}: {s.available}</div>
                  <button disabled={s.available <= 0} onClick={() => reserve(p.id, s.warehouseId)}>Reserve</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
