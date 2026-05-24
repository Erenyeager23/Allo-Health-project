import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { releaseExpiredReservations } from '../../../../lib/reservations'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await releaseExpiredReservations(prisma)
  const id = params.id
  const r = await prisma.reservation.findUnique({ where: { id }, include: { product: true, warehouse: true } })
  if (!r) return new NextResponse('Not found', { status: 404 })
  return NextResponse.json({ id: r.id, productName: r.product.name, warehouseName: r.warehouse.name, qty: r.qty, status: r.status, expiresAt: r.expiresAt })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const url = new URL((req as any).url)
  const action = url.pathname.endsWith('/confirm') ? 'confirm' : url.pathname.endsWith('/release') ? 'release' : null
  if (!action) return new NextResponse('Bad request', { status: 400 })

  const r = await prisma.reservation.findUnique({ where: { id } })
  if (!r) return new NextResponse('Not found', { status: 404 })
  if (r.status !== 'pending') return new NextResponse('Already finalised', { status: 400 })
  if (new Date() > r.expiresAt) {
    await prisma.reservation.update({ where: { id }, data: { status: 'released' } })
    await prisma.$queryRaw`
      UPDATE "Stock" SET "reserved" = "reserved" - ${r.qty}
      WHERE "productId" = ${r.productId} AND "warehouseId" = ${r.warehouseId}
    `
    return new NextResponse('Expired', { status: 410 })
  }

  if (action === 'confirm') {
    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: 'confirmed' } }),
      prisma.$queryRaw`
        UPDATE "Stock" SET "reserved" = "reserved" - ${r.qty}, "total" = "total" - ${r.qty}
        WHERE "productId" = ${r.productId} AND "warehouseId" = ${r.warehouseId}
      `
    ])
    return new NextResponse('OK')
  }

  if (action === 'release') {
    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: 'released' } }),
      prisma.$queryRaw`
        UPDATE "Stock" SET "reserved" = "reserved" - ${r.qty}
        WHERE "productId" = ${r.productId} AND "warehouseId" = ${r.warehouseId}
      `
    ])
    return new NextResponse('OK')
  }

  return new NextResponse('Bad request', { status: 400 })
}
