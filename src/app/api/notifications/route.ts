/**
 * Notifications API (FF-133 to FF-136)
 *
 * GET /api/notifications — Get notifications for authenticated user
 * POST /api/notifications — Create a notification (internal use)
 * PATCH /api/notifications — Mark notifications as read/dismissed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationType,
} from '@/lib/inseason'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as NotificationType | null
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    let notifications
    if (unreadOnly) {
      notifications = await getUnreadNotifications(user.id, limit)
    } else {
      notifications = await getNotifications(user.id, {
        type: type || undefined,
        limit,
        includeRead: true,
      })
    }

    // Also get unread count
    const unreadCount = (await getUnreadNotifications(user.id, 1000)).length

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, notificationId } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'read':
        if (!notificationId) {
          return NextResponse.json(
            { error: 'Missing notificationId for read action' },
            { status: 400 }
          )
        }
        await markNotificationRead(notificationId)
        return NextResponse.json({ success: true })

      case 'readAll':
        const count = await markAllNotificationsRead(user.id)
        return NextResponse.json({ success: true, markedCount: count })

      case 'dismiss':
        if (!notificationId) {
          return NextResponse.json(
            { error: 'Missing notificationId for dismiss action' },
            { status: 400 }
          )
        }
        await dismissNotification(notificationId)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update notification' },
      { status: 500 }
    )
  }
}
