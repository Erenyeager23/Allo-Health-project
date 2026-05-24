#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function usage() {
  console.log(`Usage:
  node scripts/updateReservation.js --id <reservationId> [--qty <newQty>] [--status <pending|confirmed|released>]
  OR adjust stock directly:
  node scripts/updateReservation.js --productId <pid> --warehouseId <wid> --setReserved <number>

Examples:
  node scripts/updateReservation.js --id 550e8400-e29b-41d4-a716-446655440000 --qty 2
  node scripts/updateReservation.js --id 550e8... --status released
  node scripts/updateReservation.js --productId 1 --warehouseId 1 --setReserved 3
`)
}

function parseArgs() {
  const out = {}
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = args[i+1] && !args[i+1].startsWith('--') ? args[++i] : true
      out[key] = val
    }
  }
  return out
}

async function main() {
  const args = parseArgs()
  if (!args.id && !(args.productId && args.warehouseId && args.setReserved)) {
    usage()
    process.exit(1)
  }

  if (args.productId && args.warehouseId && args.setReserved !== undefined) {
    const productId = parseInt(args.productId, 10)
    const warehouseId = parseInt(args.warehouseId, 10)
    const setReserved = parseInt(args.setReserved, 10)
    const stock = await prisma.stock.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } })
    if (!stock) {
      console.error('Stock row not found')
      process.exit(2)
    }
    await prisma.stock.update({ where: { id: stock.id }, data: { reserved: setReserved } })
    console.log('Updated stock.reserved to', setReserved)
    await prisma.$disconnect()
    return
  }

  const id = args.id
  const r = await prisma.reservation.findUnique({ where: { id } })
  if (!r) {
    console.error('Reservation not found for id', id)
    process.exit(2)
  }

  const updates = {}
  const ops = []

  if (args.qty !== undefined) {
    const newQty = parseInt(args.qty, 10)
    const diff = newQty - r.qty
    if (diff !== 0) {
      ops.push(prisma.stock.update({
        where: { productId_warehouseId: { productId: r.productId, warehouseId: r.warehouseId } },
        data: { reserved: { increment: diff } }
      }))
      updates.qty = newQty
    }
  }

  if (args.status) {
    const newStatus = args.status
    if (newStatus !== r.status) {
      // apply stock changes similar to app logic
      if (newStatus === 'released') {
        // decrement reserved
        ops.push(prisma.stock.update({ where: { productId_warehouseId: { productId: r.productId, warehouseId: r.warehouseId } }, data: { reserved: { decrement: r.qty } } }))
      } else if (newStatus === 'confirmed') {
        // decrement reserved and total
        ops.push(prisma.$queryRaw`UPDATE "Stock" SET "reserved" = "reserved" - ${r.qty}, "total" = "total" - ${r.qty} WHERE "productId" = ${r.productId} AND "warehouseId" = ${r.warehouseId}`)
      }
      updates.status = newStatus
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log('No changes to apply')
    await prisma.$disconnect()
    return
  }

  await prisma.$transaction(async (tx) => {
    for (const op of ops) await op
    await tx.reservation.update({ where: { id }, data: updates })
  })

  console.log('Updated reservation', id, updates)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
