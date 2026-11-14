/**
 * SignInFormBlock — email + password, sign in or create an account,
 * plus Continue on this device for LAN / local testing.
 */

import { useState, type FormEvent } from 'react'
import { Button, Icon, Input, Label } from '@/ui-mine'

export interface SignInFormBlockProps {
  busy: boolean
  error: string | null
  cloudAvailable: boolean
  onSignIn: (email: string, password: string) => void
  onSignUp: (email: string, password: string) => void
  onContinueOnThisDevice: () => void
}

export function SignInFormBlock({
  busy,
  error,
  cloudAvailable,
  onSignIn,
  onSignUp,
  onContinueOnThisDevice,
}: SignInFormBlockProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'in') onSignIn(email.trim(), password)
    else onSignUp(email.trim(), password)
  }

  return (
    <div className="space-y-3 max-w-sm">
      <div className="rounded-md bg-bg-elevated/50 p-2.5 space-y-1.5">
        <p className="text-xs text-muted">Local session — same player/coach model, no cloud.</p>
        <Button type="button" onClick={onContinueOnThisDevice} disabled={busy} className="w-full">
          <Icon name={busy ? 'loader' : 'user'} size="sm" className={busy ? 'animate-spin' : undefined} />
          Continue on this device
        </Button>
      </div>

      {cloudAvailable ? (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">Or cloud account</p>
          <div className="space-y-1.5">
            <Label htmlFor="cloud-email">Email</Label>
            <Input
              id="cloud-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cloud-password">Password</Label>
            <Input
              id="cloud-password"
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="rounded-md bg-callout-danger-bg px-2.5 py-1.5 text-xs text-callout-danger">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              <Icon name={busy ? 'loader' : 'log-in'} size="sm" className={busy ? 'animate-spin' : undefined} />
              {mode === 'in' ? 'Sign in' : 'Create account'}
            </Button>
            <button
              type="button"
              className="text-xs text-muted hover:text-primary underline-offset-2 hover:underline"
              onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
            >
              {mode === 'in' ? 'Create an account' : 'Sign in instead'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {error && (
            <p className="rounded-md bg-callout-danger-bg px-2.5 py-1.5 text-xs text-callout-danger">
              {error}
            </p>
          )}
          <p className="rounded-md bg-callout-warning-bg px-2.5 py-1.5 text-xs text-callout-warning">
            Cloud sign-in is not configured. Continue on this device.
          </p>
        </div>
      )}
    </div>
  )
}
