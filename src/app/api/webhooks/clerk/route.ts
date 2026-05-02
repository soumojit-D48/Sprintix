import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.text()
  console.log('Raw webhook body:', body)

  let evt: unknown
  try {
    evt = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = (evt as { type: string }).type
  const eventData = (evt as { data: unknown }).data

  console.log('Webhook received:', eventType)

  if (eventType === 'user.created' || eventType === 'user.completed') {
    const { id, email_addresses, first_name, last_name, image_url } = eventData as {
      id: string
      email_addresses: Array<{ email_address: string }>
      first_name?: string
      last_name?: string
      image_url?: string
    }

    const email = email_addresses?.[0]?.email_address
    const name = [first_name, last_name].filter(Boolean).join(' ') || 'Unknown'

    console.log('Creating/updating user:', { clerkId: id, email, name })

    if (!email) {
      return NextResponse.json({ error: 'No email found in webhook payload' }, { status: 400 })
    }

    try {
      const user = await prisma.user.upsert({
        where: { email },
        create: {
          clerkId: id,
          email,
          name,
          avatarUrl: image_url || null,
        },
        update: {
          clerkId: id,
          name,
          avatarUrl: image_url || null,
        },
      })
      console.log('User upserted successfully:', user.id)
    } catch (err) {
      console.error('Error upserting user:', err)
      return NextResponse.json({ error: 'Failed to upsert user' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
