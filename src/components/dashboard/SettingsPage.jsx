import { useCallback, useEffect, useState } from 'react'
import { getCurrentUserRole, getProfile, inviteUser, listUsers, updateProfile } from '../../lib/settingsApi'
import { getMarketChannelPath } from '../../lib/marketStream'
import { useAuth } from '../../contexts/AuthContext'
import { useMarketData } from '../../contexts/MarketDataContext'
import DataSourceIndicator from '../DataSourceIndicator'

function normalizeProfile(payload, user) {
  let value = payload
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { value = {} }
  }
  if (value?.body !== undefined) {
    if (typeof value.body === 'string') {
      try { value = JSON.parse(value.body) } catch { value = {} }
    } else value = value.body
  }
  const profile = value?.profile ?? value?.user ?? value?.data ?? value ?? {}
  return {
    email: profile.email ?? profile.email_address ?? user?.signInDetails?.loginId ?? user?.username ?? '',
    name: profile.name ?? profile.full_name ?? profile.fullName ?? '',
    phone: profile.number ?? profile.phone ?? profile.phone_number ?? profile.phoneNumber ?? '',
    currency: profile.currency ?? profile.preferred_currency ?? profile.preferredCurrency ?? 'INR',
  }
}

export default function SettingsPage() {
  const { user } = useAuth()
  const market = useMarketData()
  const marketFeed = { connected: market.connected, quotes: market.quoteList }
  const [profile, setProfile] = useState(() => normalizeProfile({}, user))
  const [role, setRole] = useState('user')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('user')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [symbols, setSymbols] = useState(() => market.symbols.join(', '))
  const [symbolMessage, setSymbolMessage] = useState('')
  const [symbolError, setSymbolError] = useState('')

  function saveSymbols(event) {
    event.preventDefault()
    setSymbolError('')
    setSymbolMessage('')
    try {
      const saved = market.updateSymbols(symbols)
      setSymbols(saved.join(', '))
      setSymbolMessage(`Tracking ${saved.length} symbol${saved.length === 1 ? '' : 's'}. The live connection was refreshed.`)
    } catch (error) { setSymbolError(error.message) }
  }

  const loadUsers = useCallback(async () => {
    const payload = await listUsers()
    setUsers(Array.isArray(payload) ? payload : payload?.users ?? payload?.Items ?? [])
  }, [])

  useEffect(() => {
    let active = true

    async function loadSettings() {
      setLoading(true)
      try {
        const currentRole = await getCurrentUserRole()
        if (!active) return
        setRole(currentRole)

        const profilePayload = await getProfile()
        if (!active) return
        setProfile(normalizeProfile(profilePayload, user))

        if (currentRole === 'admin') {
          try { await loadUsers() } catch (error) { if (active) setInviteError(error.message) }
        }
      } catch (error) {
        if (active) setProfileError(error.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSettings()
    return () => { active = false }
  }, [loadUsers, user])

  function changeProfile(event) {
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setProfileError('')
    setProfileSuccess('')
    try {
      const payload = await updateProfile(profile)
      if (payload) setProfile(normalizeProfile(payload, user))
      setProfileSuccess('Profile updated successfully.')
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function sendInvite(event) {
    event.preventDefault()
    setInviting(true)
    setInviteError('')
    setInviteMessage('')
    try {
      const response = await inviteUser(inviteEmail, inviteRole)
      setInviteMessage(response?.message || 'Invitation requested.')
      setInviteEmail('')
      await loadUsers()
    } catch (error) {
      setInviteError(error.message)
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-7">
      <section><p className="text-xs font-bold uppercase tracking-[0.2em] text-forest/40">Settings</p><h1 className="mt-2 font-display text-4xl tracking-[-0.04em] sm:text-5xl">Profile and team</h1><p className="mt-3 text-sm text-forest/50">Manage personal preferences and invite people to your workspace.</p></section>

      <section className="grid gap-5 xl:grid-cols-[1fr_.72fr]">
        <article className="rounded-3xl border border-forest/10 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">My profile</h2><p className="mt-1 text-xs text-forest/40">Stored through the existing profile API</p></div><span className="rounded-full bg-forest/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-forest/55">{role}</span></div>

          {loading ? <div className="mt-8 animate-pulse space-y-4"><div className="h-11 rounded-xl bg-forest/5" /><div className="h-11 rounded-xl bg-forest/5" /><div className="h-11 rounded-xl bg-forest/5" /></div> : (
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveProfile}>
              <label className="text-sm font-semibold sm:col-span-2">Email address<input name="email" type="email" value={profile.email} readOnly className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-forest/10 bg-forest/5 px-3 text-forest/45" /></label>
              <label className="text-sm font-semibold sm:col-span-2">Full name<input name="name" value={profile.name} onChange={changeProfile} placeholder="Your name" className="mt-2 h-11 w-full rounded-xl border border-forest/15 px-3 outline-none focus:border-forest" /></label>
              <label className="text-sm font-semibold">Phone number<input name="phone" type="tel" value={profile.phone} onChange={changeProfile} placeholder="+91" className="mt-2 h-11 w-full rounded-xl border border-forest/15 px-3 outline-none focus:border-forest" /></label>
              <label className="text-sm font-semibold">Preferred currency<select name="currency" value={profile.currency} onChange={changeProfile} className="mt-2 h-11 w-full rounded-xl border border-forest/15 bg-white px-3 outline-none focus:border-forest"><option value="INR">INR</option><option value="USD">USD</option></select></label>
              <button type="submit" disabled={saving} className="h-11 rounded-xl bg-forest text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">{saving ? 'Saving...' : 'Save profile'}</button>
            </form>
          )}
          {profileError && <p className="mt-4 break-words rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{profileError}</p>}
          {profileSuccess && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status">{profileSuccess}</p>}
        </article>

        <article className="rounded-3xl bg-forest p-6 text-white shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Workspace</p><h2 className="mt-4 font-display text-3xl">Secure by default.</h2><p className="mt-4 text-sm leading-6 text-white/60">Authentication is managed by Cognito. Profile and team operations use your current access token.</p>
          <div className="mt-7 space-y-4 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between"><span className="text-white/45">Sign-in provider</span><span className="font-semibold">Amazon Cognito</span></div><div className="flex justify-between"><span className="text-white/45">Account role</span><span className="font-semibold capitalize">{role}</span></div><div className="flex justify-between"><span className="text-white/45">Market provider</span><span className="font-semibold">Mock / Upstox-ready</span></div></div>
        </article>
      </section>

      <section className="rounded-3xl border border-forest/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-forest/40">Real-time market data</p><h2 className="mt-2 text-xl font-semibold">Tracked NSE symbols</h2><p className="mt-2 text-sm text-forest/50">Enter Upstox trading symbols separated by commas. Matching stocks from each <code>{getMarketChannelPath()}</code> batch will appear in the app.</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${marketFeed?.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{marketFeed?.connected ? `Live · ${marketFeed.quotes?.length || 0} received` : 'Connecting'}</span></div>
        <form onSubmit={saveSymbols} className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={symbols} onChange={(event) => setSymbols(event.target.value)} placeholder="RELIANCE, TCS, INFY" className="h-11 flex-1 rounded-xl border border-forest/15 px-3 uppercase outline-none focus:border-forest" /><button type="submit" className="h-11 rounded-xl bg-forest px-6 text-sm font-semibold text-white">Update symbols</button></form>
        <p className="mt-3 text-xs text-forest/40">The browser subscribes only to this watchlist. Production should also persist it in Aurora and notify the Fargate subscription manager so it can maintain the union of all user watchlists.</p>
        {symbolError && <p className="mt-3 text-sm text-rose-700" role="alert">{symbolError}</p>}{symbolMessage && <p className="mt-3 text-sm text-emerald-700" role="status">{symbolMessage}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5"><DataSourceIndicator source="fargate" /><h3 className="mt-4 font-semibold">Market-hours watchlist</h3><p className="mt-2 text-xs leading-5 text-forest/55">Shared Upstox WebSocket subscription, distributed through AppSync Events.</p></article>
        <article className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5"><DataSourceIndicator source="lambda" /><h3 className="mt-4 font-semibold">On-demand market data</h3><p className="mt-2 text-xs leading-5 text-forest/55">Quotes, search, details and historical candles requested through API Gateway.</p></article>
        <article className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5"><DataSourceIndicator source="demo" /><h3 className="mt-4 font-semibold">Placeholder values</h3><p className="mt-2 text-xs leading-5 text-forest/55">Generated portfolio, prediction or market values that are not backed by production data.</p></article>
      </section>

      {role === 'admin' ? (
        <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
          <article className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">Admin only</p><h2 className="mt-2 text-xl font-semibold">Invite a team member</h2><p className="mt-2 text-sm text-forest/50">Send a Cognito invitation and assign an initial group.</p>
            <form className="mt-5 space-y-4" onSubmit={sendInvite}>
              <label className="block text-sm font-semibold">Email address<input type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="person@example.com" className="mt-2 h-11 w-full rounded-xl border border-amber-300 bg-white px-3 outline-none focus:border-forest" /></label>
              <label className="block text-sm font-semibold">Cognito group<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-amber-300 bg-white px-3 outline-none focus:border-forest"><option value="user">user</option><option value="admin">admin</option></select></label>
              <button type="submit" disabled={inviting} className="h-11 w-full rounded-xl bg-amber-400 text-sm font-bold text-forest disabled:opacity-60">{inviting ? 'Sending...' : 'Send invitation'}</button>
            </form>
            {inviteError && <p className="mt-4 break-words text-sm text-rose-700" role="alert">{inviteError}</p>}{inviteMessage && <p className="mt-4 text-sm text-emerald-700" role="status">{inviteMessage}</p>}
          </article>

          <article className="overflow-hidden rounded-3xl border border-forest/10 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-forest/10 px-6 py-5"><div><h2 className="text-lg font-semibold">Team users</h2><p className="mt-1 text-xs text-forest/40">Cognito workspace access</p></div><button type="button" onClick={() => loadUsers().catch((error) => setInviteError(error.message))} className="rounded-lg border border-forest/15 px-3 py-2 text-xs font-semibold">Refresh</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-cream/60 text-left text-[10px] uppercase tracking-wider text-forest/40"><tr><th className="px-6 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y divide-forest/10">{users.length ? users.map((item, index) => <tr key={item.id ?? item.sub ?? item.email ?? index}><td className="px-6 py-4 font-medium">{item.email ?? item.Username ?? '--'}</td><td className="px-4 py-4 capitalize">{item.role ?? item.Role ?? item.groups?.[0] ?? 'user'}</td><td className="px-6 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{item.status ?? item.UserStatus ?? 'Active'}</span></td></tr>) : <tr><td colSpan="3" className="px-6 py-10 text-center text-forest/40">No users returned.</td></tr>}</tbody></table></div>
          </article>
        </section>
      ) : (
        <section className="rounded-3xl border border-forest/10 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Team access</h2><p className="mt-2 text-sm text-forest/50">Only workspace administrators can invite users or manage Cognito groups.</p></section>
      )}
    </div>
  )
}
