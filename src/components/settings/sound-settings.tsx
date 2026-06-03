'use client'

/**
 * SoundSettings - opt-in toggle for the draft sound cues. Off by default. Enabling it both
 * persists the preference and plays a short preview, which also gesture-unlocks Web Audio.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Volume2, VolumeX } from 'lucide-react'
import { useSound } from '@/lib/sound/use-sound'

export function SoundSettings() {
  const { enabled, setEnabled, play } = useSound()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Draft sounds</CardTitle>
        <CardDescription>
          Subtle audio cues during the live draft and on your post-draft grade. Off by default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <button
          type="button"
          onClick={() => {
            const next = !enabled
            setEnabled(next)
            if (next) play('yourTurn')
          }}
          className="ffi-btn-secondary"
          aria-pressed={enabled}
        >
          {enabled ? (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          )}
          {enabled ? 'Sound on' : 'Sound off'}
        </button>
      </CardContent>
    </Card>
  )
}
