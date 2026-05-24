import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

async function releaseExpiredReservations() {
  const now = new Date()
  await prisma.$executeRaw`
    UPDATE "Stock"
    SET "reserved" = "reserved" - sub.qty
    FROM (
      SELECT "id", "qty", "productId", "warehouseId"
      FROM "Reservation"
      WHERE "status" = 'pending' AND "expiresAt" <= ${now}
    ) AS sub
    WHERE "Stock"."productId" = sub."productId"
      AND "Stock"."warehouseId" = sub."warehouseId"
  `
  await prisma.reservation.updateMany({
    where: { status: 'pending', expiresAt: { lte: now } },
    data: { status: 'released' }
  })
}

export async function POST(req: Request) {
  const body = await req.json() as { productId: number | string; warehouseId: number | string; qty: number }
  let { productId, warehouseId, qty } = body
  const productIdNum = typeof productId === 'string' ? parseInt(productId, 10) : productId
  const warehouseIdNum = typeof warehouseId === 'string' ? parseInt(warehouseId, 10) : warehouseId
  const ttlMin = parseInt(process.env.RESERVATION_TTL_MINUTES || '10', 10)
  const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000)

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.$queryRaw`
      UPDATE "Stock" SET "reserved" = "reserved" + ${qty}
      WHERE "productId" = ${productIdNum} AND "warehouseId" = ${warehouseIdNum} AND ("total" - "reserved") >= ${qty}
      RETURNING id
    `
    if (!updated || (Array.isArray(updated) && updated.length === 0)) {
      return null
    }
    return tx.reservation.create({ data: { productId: productIdNum, warehouseId: warehouseIdNum, qty, expiresAt } })
  })

  if (!result) {
    return new NextResponse('Not enough stock', { status: 409 })
  }

  return new NextResponse(JSON.stringify(result), { status: 201 })
}
