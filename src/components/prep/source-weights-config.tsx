'use client'

import { useState, useCallback, useEffect } from 'react'
import { Settings2, RotateCcw, Save, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Source weight configuration for consensus ranking calculations
 * FF-223: Source Weight Configuration UI
 */

export interface SourceWeights {
  fantasypros: number
  espn: number
  sleeper: number
  fantasyFootballers: number
}

const DEFAULT_WEIGHTS: SourceWeights = {
  fantasypros: 0.35,
  espn: 0.30,
  sleeper: 0.20,
  fantasyFootballers: 0.15,
}

const SOURCE_INFO: Record<keyof SourceWeights, { label: string; description: string; color: string }> = {
  fantasypros: {
    label: 'FantasyPros ECR',
    description: 'Expert Consensus Rankings from 100+ fantasy analysts. Most comprehensive expert data.',
    color: 'bg-blue-500',
  },
  espn: {
    label: 'ESPN',
    description: 'ESPN rankings, projections, and ADP. Mainstream coverage with detailed projections.',
    color: 'bg-red-500',
  },
  sleeper: {
    label: 'Sleeper',
    description: 'ADP and trending data from Sleeper leagues. Real draft behavior from users.',
    color: 'bg-purple-500',
  },
  fantasyFootballers: {
    label: 'Fantasy Footballers',
    description: 'Rankings and sentiment tags from The Fantasy Footballers podcast experts.',
    color: 'bg-green-500',
  },
}

const STORAGE_KEY = 'ffi-source-weights'

interface SourceWeightsConfigProps {
  onWeightsChange?: (weights: SourceWeights) => void
  className?: string
  compact?: boolean
}

export function SourceWeightsConfig({
  onWeightsChange,
  className,
  compact = false,
}: SourceWeightsConfigProps) {
  const [weights, setWeights] = useState<SourceWeights>(DEFAULT_WEIGHTS)
  const [hasChanges, setHasChanges] = useState(false)

  // Load saved weights from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SourceWeights
        setWeights(parsed)
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [])

  // Calculate total weight (should sum to ~1.0)
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0)
  const isBalanced = Math.abs(totalWeight - 1.0) < 0.01

  const handleWeightChange = useCallback(
    (source: keyof SourceWeights, value: number) => {
      setWeights((prev) => {
        const newWeights = { ...prev, [source]: value }
        setHasChanges(true)
        return newWeights
      })
    },
    []
  )

  const handleReset = useCallback(() => {
    setWeights(DEFAULT_WEIGHTS)
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights))
    setHasChanges(false)
    onWeightsChange?.(weights)
  }, [weights, onWeightsChange])

  // Auto-balance weights to sum to 1.0
  const handleAutoBalance = useCallback(() => {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0)
    if (total === 0) {
      setWeights(DEFAULT_WEIGHTS)
      return
    }
    const factor = 1.0 / total
    setWeights({
      fantasypros: Math.round(weights.fantasypros * factor * 100) / 100,
      espn: Math.round(weights.espn * factor * 100) / 100,
      sleeper: Math.round(weights.sleeper * factor * 100) / 100,
      fantasyFootballers: Math.round(weights.fantasyFootballers * factor * 100) / 100,
    })
    setHasChanges(true)
  }, [weights])

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" />
            Source Weights
          </span>
          {!isBalanced && (
            <Button variant="ghost" size="sm" onClick={handleAutoBalance} className="h-6 text-xs">
              Balance
            </Button>
          )}
        </div>
        <div className="flex gap-1">
          {(Object.keys(SOURCE_INFO) as Array<keyof SourceWeights>).map((source) => (
            <TooltipProvider key={source}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      SOURCE_INFO[source].color
                    )}
                    style={{ width: `${weights[source] * 100}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{SOURCE_INFO[source].label}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(weights[source] * 100)}% weight
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Source Weights
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Adjust how much each data source influences consensus rankings
            </CardDescription>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2"
              title="Reset to defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges}
              className="h-7 px-2"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weight sliders */}
        {(Object.keys(SOURCE_INFO) as Array<keyof SourceWeights>).map((source) => (
          <div key={source} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('h-3 w-3 rounded-full', SOURCE_INFO[source].color)} />
                <span className="text-sm font-medium">{SOURCE_INFO[source].label}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">{SOURCE_INFO[source].description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {Math.round(weights[source] * 100)}%
              </span>
            </div>
            <Slider
              value={[weights[source] * 100]}
              onValueChange={([value]) => handleWeightChange(source, value / 100)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        ))}

        {/* Total weight indicator */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Weight</span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'tabular-nums font-medium',
                  isBalanced ? 'text-green-500' : 'text-yellow-500'
                )}
              >
                {Math.round(totalWeight * 100)}%
              </span>
              {!isBalanced && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoBalance}
                  className="h-6 text-xs"
                >
                  Auto-balance
                </Button>
              )}
            </div>
          </div>
          {!isBalanced && (
            <p className="text-xs text-muted-foreground mt-1">
              Weights should sum to 100% for accurate consensus calculations.
            </p>
          )}
        </div>

        {/* Visual weight bar */}
        <div className="flex h-3 rounded-full overflow-hidden">
          {(Object.keys(SOURCE_INFO) as Array<keyof SourceWeights>).map((source) => (
            <TooltipProvider key={source}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'transition-all',
                      SOURCE_INFO[source].color
                    )}
                    style={{ width: `${(weights[source] / totalWeight) * 100}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{SOURCE_INFO[source].label}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(weights[source] * 100)}% weight
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Hook to get current source weights
 */
export function useSourceWeights(): SourceWeights {
  const [weights, setWeights] = useState<SourceWeights>(DEFAULT_WEIGHTS)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setWeights(JSON.parse(saved))
      } catch {
        // Use defaults
      }
    }

    // Listen for changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setWeights(JSON.parse(e.newValue))
        } catch {
          // Ignore
        }
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return weights
}

export { DEFAULT_WEIGHTS as DEFAULT_SOURCE_WEIGHTS }
