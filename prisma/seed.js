import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const w1 = await prisma.warehouse.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Main Warehouse" }
  })

  const w2 = await prisma.warehouse.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "Backup Warehouse" }
  })

  const p1 = await prisma.product.upsert({
    where: { sku: "SKU-RED" },
    update: {},
    create: { sku: "SKU-RED", name: "Red T-Shirt" }
  })

  const p2 = await prisma.product.upsert({
    where: { sku: "SKU-BLUE" },
    update: {},
    create: { sku: "SKU-BLUE", name: "Blue Jeans" }
  })

  await prisma.stock.upsert({
    where: { productId_warehouseId: { productId: p1.id, warehouseId: w1.id } },
    update: { total: 5, reserved: 0 },
    create: { productId: p1.id, warehouseId: w1.id, total: 5 }
  })

  await prisma.stock.upsert({
    where: { productId_warehouseId: { productId: p1.id, warehouseId: w2.id } },
    update: { total: 2, reserved: 0 },
    create: { productId: p1.id, warehouseId: w2.id, total: 2 }
  })

  await prisma.stock.upsert({
    where: { productId_warehouseId: { productId: p2.id, warehouseId: w1.id } },
    update: { total: 3, reserved: 0 },
    create: { productId: p2.id, warehouseId: w1.id, total: 3 }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
