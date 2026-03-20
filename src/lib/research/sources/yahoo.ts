/**
 * Yahoo Fantasy Football API Adapter
 *
 * OAuth-based Yahoo Fantasy API for rankings, projections, auction values, and ADP.
 * Primary data source for Tyler's Yahoo league.
 *
 * DEFERRED: Yahoo requires OAuth 2.0 flow with app registration.
 * Will implement when Tyler's Yahoo league data is needed.
 * For now, consensus rankings work with Sleeper + ESPN + FantasyPros.
 *
 * Setup required:
 * 1. Register app at https://developer.yahoo.com/apps/
 * 2. Get client_id + client_secret
 * 3. Implement OAuth 2.0 authorization code flow
 * 4. Store refresh tokens per user in Supabase
 *
 * API docs: https://developer.yahoo.com/fantasysports/guide/
 */

// TODO: FF-011 — Implement Yahoo data fetching (OAuth flow)

export async function fetchYahooRankings() {
  throw new Error('Yahoo adapter not yet implemented — requires OAuth setup')
}

export async function fetchYahooProjections() {
  throw new Error('Yahoo adapter not yet implemented — requires OAuth setup')
}

export async function fetchYahooAuctionValues() {
  throw new Error('Yahoo adapter not yet implemented — requires OAuth setup')
}

export async function fetchYahooADP() {
  throw new Error('Yahoo adapter not yet implemented — requires OAuth setup')
}
