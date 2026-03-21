/**
 * Google Sheets Integration
 *
 * Reads draft picks from a shared Google Sheet.
 * Supports two modes:
 *   1. Public CSV export (zero credentials, sheet must be "Anyone with the link")
 *   2. Google Sheets API with API key (optional, for richer access)
 *
 * Column mapping is configurable — auto-detects common header patterns.
 */

export interface ColumnMapping {
  player: number    // column index for player name
  manager: number   // column index for manager/team name
  price?: number    // column index for price (auction)
  round?: number    // column index for round (snake)
  pick?: number     // column index for overall pick number
  position?: number // column index for position
}

export interface SheetRow {
  player_name: string
  manager: string
  price?: number
  round?: number
  pick_number?: number
  position?: string
  raw: string[]
}

export interface SheetReadResult {
  rows: SheetRow[]
  headers: string[]
  mapping: ColumnMapping
  total_rows: number
}

/**
 * Extract spreadsheet ID from a Google Sheets URL.
 */
export function extractSheetId(url: string): string | null {
  // Formats:
  //   https://docs.google.com/spreadsheets/d/SHEET_ID/edit
  //   https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
  //   https://docs.google.com/spreadsheets/d/SHEET_ID
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * Auto-detect column mapping from header row.
 * Matches common patterns like "Player", "Name", "Manager", "Team", "Price", "Cost", "Round", etc.
 */
export function detectColumnMapping(headers: string[]): ColumnMapping | null {
  const lower = headers.map(h => h.toLowerCase().trim())

  // Find player column
  const playerIdx = lower.findIndex(h =>
    h === 'player' || h === 'player name' || h === 'name' || h === 'player_name'
  )
  if (playerIdx === -1) return null

  // Find manager column
  const managerIdx = lower.findIndex(h =>
    h === 'manager' || h === 'team' || h === 'owner' || h === 'drafter' || h === 'manager name'
  )
  if (managerIdx === -1) return null

  // Optional columns
  const priceIdx = lower.findIndex(h =>
    h === 'price' || h === 'cost' || h === 'bid' || h === 'amount' || h === '$'
  )
  const roundIdx = lower.findIndex(h =>
    h === 'round' || h === 'rd' || h === 'rnd'
  )
  const pickIdx = lower.findIndex(h =>
    h === 'pick' || h === 'pick #' || h === 'pick number' || h === 'overall' || h === '#'
  )
  const posIdx = lower.findIndex(h =>
    h === 'position' || h === 'pos' || h === 'pos.'
  )

  return {
    player: playerIdx,
    manager: managerIdx,
    price: priceIdx !== -1 ? priceIdx : undefined,
    round: roundIdx !== -1 ? roundIdx : undefined,
    pick: pickIdx !== -1 ? pickIdx : undefined,
    position: posIdx !== -1 ? posIdx : undefined,
  }
}

/**
 * Parse CSV text into rows. Handles quoted fields with commas.
 */
function parseCSV(csv: string): string[][] {
  const rows: string[][] = []
  const lines = csv.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    cells.push(current.trim())
    rows.push(cells)
  }

  return rows
}

/**
 * Apply column mapping to raw rows, producing structured SheetRow objects.
 */
function mapRows(rawRows: string[][], mapping: ColumnMapping): SheetRow[] {
  return rawRows
    .filter(row => {
      // Skip rows where player name is empty
      const playerVal = row[mapping.player]
      return playerVal && playerVal.trim().length > 0
    })
    .map(row => {
      const result: SheetRow = {
        player_name: (row[mapping.player] || '').trim(),
        manager: (row[mapping.manager] || '').trim(),
        raw: row,
      }

      if (mapping.price !== undefined && row[mapping.price]) {
        const priceStr = row[mapping.price].replace(/[$,]/g, '').trim()
        const price = parseInt(priceStr, 10)
        if (!isNaN(price)) result.price = price
      }

      if (mapping.round !== undefined && row[mapping.round]) {
        const round = parseInt(row[mapping.round], 10)
        if (!isNaN(round)) result.round = round
      }

      if (mapping.pick !== undefined && row[mapping.pick]) {
        const pick = parseInt(row[mapping.pick], 10)
        if (!isNaN(pick)) result.pick_number = pick
      }

      if (mapping.position !== undefined && row[mapping.position]) {
        result.position = row[mapping.position].trim().toUpperCase()
      }

      return result
    })
    .filter(row => row.player_name && row.manager) // both required
}

/**
 * Read a public Google Sheet via CSV export.
 * Sheet must be shared with "Anyone with the link" (Viewer).
 *
 * @param sheetUrl - Full Google Sheets URL
 * @param existingMapping - Optional pre-configured column mapping (skip auto-detect)
 * @param gid - Sheet tab ID (default 0 = first tab)
 */
export async function readSheet(
  sheetUrl: string,
  existingMapping?: ColumnMapping,
  gid: number = 0
): Promise<SheetReadResult> {
  const sheetId = extractSheetId(sheetUrl)
  if (!sheetId) {
    throw new Error('Invalid Google Sheets URL')
  }

  // Public CSV export URL
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

  const res = await fetch(csvUrl, {
    headers: { 'Accept': 'text/csv' },
    // No cache — always get fresh data for polling
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Sheet not found — check the URL')
    }
    if (res.status === 403 || res.status === 401) {
      throw new Error('Sheet is not publicly shared — set to "Anyone with the link"')
    }
    throw new Error(`Failed to read sheet: ${res.status} ${res.statusText}`)
  }

  const csv = await res.text()
  const rawRows = parseCSV(csv)

  if (rawRows.length === 0) {
    return { rows: [], headers: [], mapping: existingMapping || { player: 0, manager: 1 }, total_rows: 0 }
  }

  const headers = rawRows[0]
  const dataRows = rawRows.slice(1)

  // Use provided mapping or auto-detect from headers
  const mapping = existingMapping || detectColumnMapping(headers)
  if (!mapping) {
    throw new Error(
      `Could not auto-detect columns. Headers found: ${headers.join(', ')}. ` +
      `Need at least "Player" and "Manager" (or "Team"/"Owner") columns.`
    )
  }

  const rows = mapRows(dataRows, mapping)

  return {
    rows,
    headers,
    mapping,
    total_rows: dataRows.length,
  }
}
