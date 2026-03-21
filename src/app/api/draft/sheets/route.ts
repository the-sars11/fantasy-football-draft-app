/**
 * POST /api/draft/sheets — Read current picks from a Google Sheet
 *
 * Called by the live draft page to poll for new picks.
 * Returns all rows with optional column mapping override.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readSheet, type ColumnMapping } from '@/lib/sheets'

interface PollRequest {
  sheet_url: string
  mapping?: ColumnMapping
  gid?: number
  after_row?: number // only return rows after this index (for incremental polling)
}

export async function POST(request: NextRequest) {
  try {
    const body: PollRequest = await request.json()

    if (!body.sheet_url) {
      return NextResponse.json(
        { error: 'sheet_url is required' },
        { status: 400 }
      )
    }

    const result = await readSheet(
      body.sheet_url,
      body.mapping,
      body.gid ?? 0
    )

    // If after_row is specified, only return new rows
    const rows = body.after_row !== undefined
      ? result.rows.slice(body.after_row)
      : result.rows

    return NextResponse.json({
      rows,
      headers: result.headers,
      mapping: result.mapping,
      total_rows: result.total_rows,
      new_rows: body.after_row !== undefined
        ? result.rows.length - body.after_row
        : result.rows.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
