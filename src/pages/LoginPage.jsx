import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { confirmAmplifySignIn, getAmplifyUser, getSignInStepMessage, signInWithAmplify } from '../lib/amplify'

function attributeLabel(value) {
  return String(value).replace(/^custom:/, '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [challenge, setChallenge] = useState(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function finishSignIn() {
    const user = await getAmplifyUser()
    signIn(user)
    navigate(location.state?.from?.pathname || '/overview', { replace: true })
  }

  function handleNextStep(result) {
    if (result.isSignedIn) return true
    if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      setChallenge({ type: 'new-password', missingAttributes: result.nextStep.missingAttributes || [] })
      setMessage('Choose a permanent password to finish signing in.')
      return false
    }
    setMessage(getSignInStepMessage(result.nextStep))
    return false
  }

  async function handleLogin(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setMessage('Signing in…')
    try {
      const result = await signInWithAmplify(String(form.get('email')).trim(), String(form.get('password')))
      if (handleNextStep(result)) await finishSignIn()
    } catch (error) {
      setMessage(error?.message || 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleNewPassword(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const newPassword = String(form.get('newPassword'))
    const confirmation = String(form.get('confirmPassword'))
    if (newPassword !== confirmation) { setMessage('The new passwords do not match.'); return }

    const attributes = Object.fromEntries(
      (challenge?.missingAttributes || []).map((name) => [name, String(form.get(`attribute:${name}`) || '').trim()]),
    )
    setSubmitting(true)
    setMessage('Setting your permanent password…')
    try {
      const result = await confirmAmplifySignIn(newPassword, attributes)
      if (handleNextStep(result)) await finishSignIn()
    } catch (error) {
      setMessage(error?.message || 'Unable to set the new password.')
    } finally {
      setSubmitting(false)
    }
  }

  const newPasswordRequired = challenge?.type === 'new-password'

  return (
    <main className="grid min-h-screen bg-cream p-4 text-forest lg:grid-cols-2 lg:p-8">
      <section className="relative hidden overflow-hidden rounded-l-[2rem] bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-center"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Wealth, made clear</p><h1 className="mt-6 max-w-lg font-display text-6xl leading-tight">Your financial future, in focus.</h1><p className="mt-6 max-w-md leading-7 text-white/60">Track every investment and make confident decisions from one calm place.</p></section>
      <section className="flex items-center justify-center rounded-[2rem] bg-white p-7 shadow-card lg:rounded-l-none lg:p-16">
        <div className="w-full max-w-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest/45">{newPasswordRequired ? 'First sign-in' : 'Welcome back'}</p>
          <h2 className="mt-3 font-display text-4xl">{newPasswordRequired ? 'Set your password' : 'Sign in to your account'}</h2>

          {!newPasswordRequired ? (
            <form className="mt-8 space-y-5" onSubmit={handleLogin}>
              <label className="block text-sm font-semibold">Email address<input name="email" type="email" required autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-forest/15 px-4 outline-none focus:border-forest" /></label>
              <label className="block text-sm font-semibold">Password<div className="relative mt-2"><input name="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" className="h-12 w-full rounded-xl border border-forest/15 px-4 pr-16 outline-none focus:border-forest" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-forest/50">{showPassword ? 'Hide' : 'Show'}</button></div></label>
              <button disabled={submitting} className="h-12 w-full rounded-xl bg-forest text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleNewPassword}>
              <p className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">Your temporary password was accepted. Cognito requires you to choose a permanent password before continuing.</p>
              {(challenge.missingAttributes || []).map((attribute) => <label key={attribute} className="block text-sm font-semibold">{attributeLabel(attribute)}<input name={`attribute:${attribute}`} required className="mt-2 h-12 w-full rounded-xl border border-forest/15 px-4 outline-none focus:border-forest" /></label>)}
              <label className="block text-sm font-semibold">New password<input name="newPassword" type={showPassword ? 'text' : 'password'} required minLength="8" autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-forest/15 px-4 outline-none focus:border-forest" /></label>
              <label className="block text-sm font-semibold">Confirm new password<input name="confirmPassword" type={showPassword ? 'text' : 'password'} required minLength="8" autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-forest/15 px-4 outline-none focus:border-forest" /></label>
              <label className="flex items-center gap-2 text-xs text-forest/55"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />Show passwords</label>
              <button disabled={submitting} className="h-12 w-full rounded-xl bg-forest text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Saving…' : 'Set password and continue'}</button>
              <button type="button" onClick={() => { setChallenge(null); setMessage('') }} className="w-full text-xs font-semibold text-forest/45 hover:text-forest">Back to sign in</button>
            </form>
          )}
          <p className="mt-4 min-h-5 text-center text-xs text-rose-600" role="status">{message}</p>
        </div>
      </section>
    </main>
  )
}
