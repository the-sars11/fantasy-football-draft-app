/**
 * GET /api/players/status
 *
 * Returns cache status — total players, last updated, source freshness.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCacheStatus } from '@/lib/research/cache'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials')
  }
  return createClient(url, serviceKey)
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const status = await getCacheStatus(supabase)

    return NextResponse.json(status)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
