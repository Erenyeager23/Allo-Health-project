import { PrismaClient } from '@prisma/client'

export async function releaseExpiredReservations(prisma: PrismaClient) {
  const now = new Date()
  const expired = await prisma.reservation.findMany({
    where: { status: 'pending', expiresAt: { lte: now } },
    select: { id: true, qty: true, productId: true, warehouseId: true }
  })
  if (expired.length === 0) return

  await prisma.$transaction(async (tx) => {
    for (const item of expired) {
      await tx.stock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId } },
        data: { reserved: { decrement: item.qty } }
      })
    }

    await tx.reservation.updateMany({
      where: { id: { in: expired.map((item) => item.id) } },
      data: { status: 'released' }
    })
  })
}
