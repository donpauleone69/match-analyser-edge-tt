/**
 * SignInFormBlock — email + password, sign in or create an account.
 */

import { useState, type FormEvent } from 'react'
import { Button, Icon, Input, Label } from '@/ui-mine'

export interface SignInFormBlockProps {
  busy: boolean
  error: string | null
  onSignIn: (email: string, password: string) => void
  onSignUp: (email: string, password: string) => void
}

export function SignInFormBlock({ busy, error, onSignIn, onSignUp }: SignInFormBlockProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'in') onSignIn(email.trim(), password)
    else onSignUp(email.trim(), password)
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-sm">
      <div className="space-y-1.5">
        <Label htmlFor="cloud-email">Email</Label>
        <Input id="cloud-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          <Icon name={busy ? 'loader' : 'log-in'} size="sm" className={busy ? 'animate-spin' : undefined} />
          {mode === 'in' ? 'Sign in' : 'Create account'}
        </Button>
        <button
          type="button"
          className="text-sm text-neutral-400 hover:text-neutral-100 underline-offset-2 hover:underline"
          onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
        >
          {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </div>
    </form>
  )
}
