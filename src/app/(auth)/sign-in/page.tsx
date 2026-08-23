'use client'

import { useActionState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, type AuthState } from '../actions'
import { FFIButton } from '@/components/ui/ffi-primitives'

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_error: 'Authentication failed. Please try again.',
  verification_failed: 'Email verification failed. Please request a new link.',
}

// SHIELD wordmark header: Oswald wordmark over the red-bevel display title
function AuthHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="text-center mb-7">
      <div
        style={{
          fontFamily: 'var(--font-oswald)',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '0.02em',
          color: 'var(--ffi-ink)',
        }}
      >
        FANTASY
      </div>
      <div className="ffi-title-red" style={{ fontSize: 40, lineHeight: 0.9, letterSpacing: '0.01em' }}>
        DRAFT ADVISOR
      </div>
      <div
        style={{
          fontFamily: 'var(--font-cond)',
          fontSize: 12,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--ffi-ink-3)',
          marginTop: 8,
        }}
      >
        {subtitle}
      </div>
    </div>
  )
}

// SHIELD field: condensed uppercase label above a volt-focus input
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="block mb-1.5"
        style={{
          fontFamily: 'var(--font-cond)',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ffi-ink-2)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function SignInForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || ''
  const errorCode = searchParams.get('error')

  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, {})

  return (
    <div>
      <AuthHeader subtitle="Sign in to your account" />

      <div className="ffi-card-elevated ffi-sheen">
        {(state.error || errorCode) && (
          <div
            className="mb-4 rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: 'rgba(255, 110, 138, 0.12)',
              border: '1px solid rgba(255, 110, 138, 0.25)',
              color: 'var(--ffi-danger)',
            }}
          >
            {state.error || ERROR_MESSAGES[errorCode!] || 'An error occurred'}
          </div>
        )}
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="redirect" value={redirectTo} />
          <Field label="Email">
            <input
              id="email"
              name="email"
              type="email"
              placeholder="joe@example.com"
              autoComplete="email"
              required
              className="ffi-input ffi-form-input"
            />
          </Field>
          <Field label="Password">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="ffi-input ffi-form-input"
            />
          </Field>
          <FFIButton type="submit" variant="hero" className="w-full mt-1" disabled={pending}>
            {pending ? 'Signing in...' : 'Sign In'}
          </FFIButton>
        </form>
      </div>

      <div className="flex items-center justify-between mt-4 px-1" style={{ fontSize: 12.5 }}>
        <Link href="/forgot-password" style={{ color: 'var(--ffi-blue-bright)' }} className="hover:opacity-80 transition-opacity">
          Forgot password?
        </Link>
        <span style={{ color: 'var(--ffi-ink-3)' }}>
          No account?{' '}
          <Link href="/sign-up" style={{ color: 'var(--ffi-blue-bright)' }} className="hover:opacity-80 transition-opacity">
            Sign up
          </Link>
        </span>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
