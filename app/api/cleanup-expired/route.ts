import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { releaseExpiredReservations } from '../../../lib/reservations'

export async function POST() {
  await releaseExpiredReservations(prisma)
  return NextResponse.json({ ok: true })
}
