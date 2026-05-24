import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
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

  await prisma.$transaction([
    prisma.reservation.update({ where: { id }, data: { status: 'confirmed' } }),
    prisma.$queryRaw`
      UPDATE "Stock" SET "reserved" = "reserved" - ${r.qty}, "total" = "total" - ${r.qty}
      WHERE "productId" = ${r.productId} AND "warehouseId" = ${r.warehouseId}
    `
  ])

  return new NextResponse('OK')
}
