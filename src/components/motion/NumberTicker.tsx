'use client'

import { cn } from '@/lib/utils'
import { useNumberTicker } from '@/hooks/use-number-ticker'

interface NumberTickerProps {
  value: number
  format?: (v: number) => string
  className?: string
  /** Extra content shown inline after the value (e.g. a delta label) */
  showDelta?: boolean
  deltaFormat?: (d: number) => string
}

/**
 * Displays a number that flashes and slides on change (volt = up, danger = down).
 * Wrap any live number with this: budget, max bid, rank, slots remaining.
 */
export function NumberTicker({
  value,
  format = v => String(v),
  className,
  showDelta = false,
  deltaFormat,
}: NumberTickerProps) {
  const { flashing, direction, delta } = useNumberTicker(value)

  const flashClass = flashing
    ? direction === 'up'
      ? 'flash-up'
      : 'flash-down'
    : ''

  const deltaLabel =
    delta != null && deltaFormat
      ? deltaFormat(delta)
      : delta != null
        ? `${delta > 0 ? '+' : ''}${delta}`
        : null

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={cn('ffi-num-value', flashClass, className)}>
        {format(value)}
      </span>
      {showDelta && deltaLabel && (
        <span
          className={cn(
            'ffi-num-delta',
            flashing ? 'show' : '',
            direction === 'up' ? 'pos' : 'neg',
          )}
        >
          {deltaLabel}
        </span>
      )}
    </span>
  )
}
