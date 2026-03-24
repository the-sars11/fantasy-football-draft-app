/**
 * Push Subscription API (FF-133)
 *
 * POST /api/notifications/push — Subscribe to push notifications
 * DELETE /api/notifications/push — Unsubscribe from push notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  savePushSubscription,
  removePushSubscription,
  getPushSubscriptions,
} from '@/lib/inseason'

export async function GET() {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptions = await getPushSubscriptions(user.id)

    return NextResponse.json({
      subscribed: subscriptions.length > 0,
      subscriptions,
    })
  } catch (error) {
    console.error('Push subscription fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid push subscription format' },
        { status: 400 }
      )
    }

    await savePushSubscription(user.id, { endpoint, keys })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save push subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await removePushSubscription(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove push subscription' },
      { status: 500 }
    )
  }
}
