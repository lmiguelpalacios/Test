import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useOrg } from '../../auth/OrgContext'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { mode, loading, user, signInWithPassword, signUpWithPassword, signOut } =
    useAuth()
  const {
    loading: orgLoading,
    memberships,
    activeOrganizationId,
    setActiveOrganizationId,
    createOrganization,
  } = useOrg()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | undefined>()
  const [orgName, setOrgName] = useState('Nordlicht Übungsklasse')
  const [orgSlug, setOrgSlug] = useState('nordlicht-uebung')
  const [busy, setBusy] = useState(false)

  if (mode === 'local') return <>{children}</>
  if (loading) {
    return (
      <div className="auth-gate">
        <p>Sitzung wird geladen…</p>
      </div>
    )
  }

  if (!user) {
    const onSubmit = async (event: FormEvent, kind: 'in' | 'up') => {
      event.preventDefault()
      setBusy(true)
      setMessage(undefined)
      const result =
        kind === 'in'
          ? await signInWithPassword(email.trim(), password)
          : await signUpWithPassword(email.trim(), password)
      setBusy(false)
      if (!result.ok) setMessage(result.message)
      else if (kind === 'up') {
        setMessage('Konto angelegt — ggf. E-Mail bestätigen, dann anmelden.')
      }
    }

    return (
      <div className="auth-gate">
        <div className="auth-card">
          <h1>Supabase-Anmeldung</h1>
          <p className="auth-lead">
            Online-Modus ist aktiv (URL + Anon-Key gesetzt). Es gibt keinen stillen
            Hybrid mit localStorage — bitte anmelden oder Env entfernen für den
            lokalen Demo-Modus.
          </p>
          <form className="auth-form" onSubmit={(event) => void onSubmit(event, 'in')}>
            <label>
              E-Mail
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Passwort
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>
            {message ? <p className="auth-error">{message}</p> : null}
            <div className="auth-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Anmelden
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={(event) => void onSubmit(event as unknown as FormEvent, 'up')}
              >
                Registrieren
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (orgLoading) {
    return (
      <div className="auth-gate">
        <p>Organisationen werden geladen…</p>
      </div>
    )
  }

  if (!activeOrganizationId) {
    const onCreate = async (event: FormEvent) => {
      event.preventDefault()
      setBusy(true)
      setMessage(undefined)
      const result = await createOrganization(orgName, orgSlug)
      setBusy(false)
      if (!result.ok) setMessage(result.message)
    }

    return (
      <div className="auth-gate">
        <div className="auth-card">
          <h1>Organisation wählen</h1>
          <p className="auth-lead">
            Angemeldet als {user.email}. Keine Mitgliedschaft gefunden — lege eine
            Übungsorganisation an (Owner).
          </p>
          {memberships.length > 0 ? (
            <ul className="org-list">
              {memberships.map((item) => (
                <li key={item.organizationId}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveOrganizationId(item.organizationId)}
                  >
                    {item.organizationName} ({item.role})
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <form className="auth-form" onSubmit={(event) => void onCreate(event)}>
            <label>
              Name
              <input
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                required
              />
            </label>
            <label>
              Slug
              <input
                value={orgSlug}
                onChange={(event) => setOrgSlug(event.target.value)}
                required
                pattern="[a-z0-9-]+"
              />
            </label>
            {message ? <p className="auth-error">{message}</p> : null}
            <div className="auth-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Organisation anlegen
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
                Abmelden
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
