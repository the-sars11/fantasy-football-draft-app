/**
 * Platform Connection API
 *
 * POST /api/roster/connect — Connect to Sleeper/ESPN/Yahoo
 * GET /api/roster/connect — Get user's platform connections
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  connectSleeper,
  getUserConnections,
} from '@/lib/inseason'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, username } = body

    if (!platform || !username) {
      return NextResponse.json(
        { error: 'Missing platform or username' },
        { status: 400 }
      )
    }

    // Connect based on platform
    switch (platform) {
      case 'sleeper': {
        const result = await connectSleeper(user.id, username)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          platform: 'sleeper',
          username,
          leagues: result.leagues,
        })
      }

      case 'espn':
      case 'yahoo':
        return NextResponse.json(
          { error: `${platform} OAuth not yet implemented` },
          { status: 501 }
        )

      default:
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Connection error:', error)
    return NextResponse.json(
      { error: 'Failed to connect platform' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connections = await getUserConnections(user.id)

    return NextResponse.json({
      connections: connections.map((c) => ({
        platform: c.platform,
        username: c.platform_username,
        connectedAt: c.created_at,
      })),
    })
  } catch (error) {
    console.error('Get connections error:', error)
    return NextResponse.json(
      { error: 'Failed to get connections' },
      { status: 500 }
    )
  }
}
