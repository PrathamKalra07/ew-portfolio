import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getAmplifyUser, signOutWithAmplify } from '../lib/amplify'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('checking')
  const [user, setUser] = useState(null)

  useEffect(() => {
    let active = true
    getAmplifyUser()
      .then((currentUser) => { if (active) { setUser(currentUser); setStatus('signedIn') } })
      .catch(() => { if (active) { setUser(null); setStatus('signedOut') } })
    return () => { active = false }
  }, [])

  const value = useMemo(() => ({
    status, user,
    signIn(currentUser) { setUser(currentUser); setStatus('signedIn') },
    async signOut() { await signOutWithAmplify(); setUser(null); setStatus('signedOut') },
  }), [status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
