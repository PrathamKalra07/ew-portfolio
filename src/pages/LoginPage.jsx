import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAmplifyUser, getSignInStepMessage, signInWithAmplify } from '../lib/amplify'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setMessage('Signing in...')
    try {
      const result = await signInWithAmplify(String(form.get('email')).trim(), String(form.get('password')))
      if (!result.isSignedIn) { setMessage(getSignInStepMessage(result.nextStep)); return }
      const user = await getAmplifyUser()
      signIn(user)
      navigate(location.state?.from?.pathname || '/overview', { replace: true })
    } catch (error) { setMessage(error?.message || 'Unable to sign in.') } finally { setSubmitting(false) }
  }

  return <main className="grid min-h-screen bg-cream p-4 text-forest lg:grid-cols-2 lg:p-8"><section className="relative hidden overflow-hidden rounded-l-[2rem] bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-center"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Wealth, made clear</p><h1 className="mt-6 max-w-lg font-display text-6xl leading-tight">Your financial future, in focus.</h1><p className="mt-6 max-w-md leading-7 text-white/60">Track every investment and make confident decisions from one calm place.</p></section><section className="flex items-center justify-center rounded-[2rem] bg-white p-7 shadow-card lg:rounded-l-none lg:p-16"><div className="w-full max-w-sm"><p className="text-xs font-bold uppercase tracking-[0.2em] text-forest/45">Welcome back</p><h2 className="mt-3 font-display text-4xl">Sign in to your account</h2><form className="mt-8 space-y-5" onSubmit={handleSubmit}><label className="block text-sm font-semibold">Email address<input name="email" type="email" required autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-forest/15 px-4 outline-none focus:border-forest" /></label><label className="block text-sm font-semibold">Password<div className="relative mt-2"><input name="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" className="h-12 w-full rounded-xl border border-forest/15 px-4 pr-16 outline-none focus:border-forest" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-forest/50">{showPassword ? 'Hide' : 'Show'}</button></div></label><button disabled={submitting} className="h-12 w-full rounded-xl bg-forest text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Signing in...' : 'Sign in'}</button><p className="min-h-5 text-center text-xs text-rose-600" role="status">{message}</p></form></div></section></main>
}
