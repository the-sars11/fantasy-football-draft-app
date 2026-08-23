'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp, type AuthState } from '../actions'
import { FFIButton } from '@/components/ui/ffi-primitives'

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

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, {})

  if (state.success) {
    return (
      <div>
        <AuthHeader subtitle="Almost there" />
        <div className="ffi-card-elevated ffi-sheen text-center">
          <h2 className="ffi-title-chrome mb-2" style={{ fontSize: 22, lineHeight: 1.1 }}>
            Check Your Email
          </h2>
          <p className="ffi-body-md" style={{ color: 'var(--ffi-ink-2)' }}>
            We sent a confirmation link to your email. Click it to activate your account.
          </p>
          <div className="mt-5">
            <Link
              href="/sign-in"
              style={{ color: 'var(--ffi-blue-bright)', fontSize: 12.5 }}
              className="hover:opacity-80 transition-opacity"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AuthHeader subtitle="Create your account" />

      <div className="ffi-card-elevated ffi-sheen">
        {state.error && (
          <div
            className="mb-4 rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: 'rgba(255, 110, 138, 0.12)',
              border: '1px solid rgba(255, 110, 138, 0.25)',
              color: 'var(--ffi-danger)',
            }}
          >
            {state.error}
          </div>
        )}
        <form action={formAction} className="space-y-3">
          <Field label="Full Name">
            <input
              id="fullName"
              name="fullName"
              placeholder="Joe Rasar"
              autoComplete="name"
              required
              className="ffi-input ffi-form-input"
            />
          </Field>
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
              minLength={8}
              autoComplete="new-password"
              required
              className="ffi-input ffi-form-input"
            />
          </Field>
          <Field label="Confirm Password">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              className="ffi-input ffi-form-input"
            />
          </Field>
          <FFIButton type="submit" variant="hero" className="w-full mt-1" disabled={pending}>
            {pending ? 'Creating account...' : 'Create Account'}
          </FFIButton>
        </form>
      </div>

      <div className="text-center mt-4 px-1" style={{ fontSize: 12.5, color: 'var(--ffi-ink-3)' }}>
        Already have an account?{' '}
        <Link href="/sign-in" style={{ color: 'var(--ffi-blue-bright)' }} className="hover:opacity-80 transition-opacity">
          Sign in
        </Link>
      </div>
    </div>
  )
}
