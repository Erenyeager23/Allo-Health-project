import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { releaseExpiredReservations } from '../../../lib/reservations'

export async function GET() {
  await releaseExpiredReservations(prisma)
  const prods = await prisma.product.findMany({ include: { stocks: { include: { warehouse: true } } } })
  const out = prods.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stocks: p.stocks.map(s => ({ warehouseId: s.warehouseId, warehouseName: s.warehouse.name, available: s.total - s.reserved }))
  }))
  return NextResponse.json(out)
}
