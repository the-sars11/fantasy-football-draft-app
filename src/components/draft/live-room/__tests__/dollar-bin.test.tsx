import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DollarBinPanel } from '../dollar-bin'
import type { DollarBin, DollarBinRow } from '@/lib/draft/dollar-bin'

function row(o: Partial<DollarBinRow> & { id: string }): DollarBinRow {
  return {
    name: o.id,
    position: 'RB',
    starred: false,
    priceLabel: '$1',
    posRank: 'RB38',
    signals: ['dart'],
    ...o,
  }
}

function renderBin(bin: DollarBin, onToggle = () => {}) {
  return render(<DollarBinPanel bin={bin} onToggleTarget={onToggle} />)
}

describe('DollarBinPanel', () => {
  it('prompts to star when the bin is empty', () => {
    renderBin({ starred: [], darts: [] })
    expect(screen.getByText(/Star anyone to pin them here/i)).toBeInTheDocument()
  })

  it('renders starred watchlist rows with a filled star', () => {
    renderBin({ starred: [row({ id: 'a', name: 'Kyle Monangai', starred: true })], darts: [] })
    expect(screen.getByText('Kyle Monangai')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Unpin Kyle Monangai/i })).toHaveTextContent('★')
  })

  it('shows the model-darts divider only when both groups are present', () => {
    renderBin({
      starred: [row({ id: 'a', name: 'Pinned', starred: true })],
      darts: [row({ id: 'b', name: 'Dart Guy' })],
    })
    expect(screen.getByText(/model darts/i)).toBeInTheDocument()
  })

  it('hides the divider when there is no watchlist', () => {
    renderBin({ starred: [], darts: [row({ id: 'b', name: 'Dart Guy' })] })
    expect(screen.queryByText(/model darts/i)).not.toBeInTheDocument()
  })

  it('renders the price band with a to-tail', () => {
    renderBin({ starred: [], darts: [row({ id: 'b', name: 'Dart', priceLabel: '$1 to $3' })] })
    const rowEl = screen.getByTestId('bin-row-b')
    expect(rowEl).toHaveTextContent('$1')
    expect(rowEl).toHaveTextContent(/to \$3/i)
  })

  it('toggles the shared target state when a star is clicked', () => {
    const onToggle = vi.fn()
    renderBin({ starred: [], darts: [row({ id: 'b', name: 'Dart Guy' })] }, onToggle)
    fireEvent.click(screen.getByRole('button', { name: /Pin Dart Guy/i }))
    expect(onToggle).toHaveBeenCalledWith('b')
  })

  it('shows the split explainer note when the bin has rows', () => {
    renderBin({ starred: [row({ id: 'a', name: 'Pinned', starred: true })], darts: [] })
    expect(screen.getByText(/your watchlist/i)).toBeInTheDocument()
    expect(screen.getByText(/not random filler/i)).toBeInTheDocument()
  })
})
