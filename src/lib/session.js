// ──────────────────────────────────────────────────────────────────────────────
// Session tracking (Phase 2) — last-activity heartbeat.
//
// One user_sessions row per browser tab. We create it at login, stamp
// last_seen_at on a heartbeat while the tab is visible, and set ended_at on an
// explicit logout. Duration is coalesce(ended_at, last_seen_at) - started_at —
// an ESTIMATE of active time, since a tab closed without logout just stops
// heart-beating (no reliable logout event in a PWA).
//
// All DB calls here are plain data operations (never auth calls), so they are
// safe to run outside the onAuthStateChange lock the SDK warns about.
// Everything is fire-and-forget: session tracking must never block or break a
// user action.
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

const STORAGE_KEY  = 'cims_session_id'   // per-tab (sessionStorage) — survives refresh, dies with the tab
const HEARTBEAT_MS = 60_000              // stamp last_seen at most once a minute

function readStoredId() {
  try { return sessionStorage.getItem(STORAGE_KEY) } catch { return null }
}
function writeStoredId(id) {
  try { id ? sessionStorage.setItem(STORAGE_KEY, id) : sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

/** Create a new session row for this tab, or resume the one already stored. */
async function startOrResumeSession(profile) {
  if (!profile?.auth_user_id) return null

  // Resume: a row already exists for this tab (e.g. after a page refresh).
  const existing = readStoredId()
  if (existing) {
    // Touch it so a refresh counts as continued activity; if the row is gone
    // (e.g. admin cleanup) we silently fall through to creating a new one.
    const { data, error } = await supabase
      .from('user_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existing)
      .select('id')
      .maybeSingle()
    if (!error && data?.id) return data.id
    writeStoredId(null)
  }

  // Create a fresh session row.
  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      auth_user_id: profile.auth_user_id,
      user_name:    profile.full_name || profile.username || 'Unknown',
      user_email:   profile.email || profile.auth_email || null,
      user_role:    profile.role || null,
      user_agent:   (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.slice(0, 300) : null,
    })
    .select('id')
    .single()
  if (error) { console.warn('startSession failed:', error.message); return null }
  writeStoredId(data.id)
  return data.id
}

async function heartbeat(sessionId) {
  if (!sessionId) return
  try {
    await supabase
      .from('user_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', sessionId)
  } catch (e) {
    console.warn('session heartbeat failed:', e?.message)
  }
}

/** Mark the current tab's session ended (explicit logout). */
export async function endSession() {
  const id = readStoredId()
  if (!id) return
  writeStoredId(null)
  try {
    const now = new Date().toISOString()
    await supabase
      .from('user_sessions')
      .update({ ended_at: now, last_seen_at: now })
      .eq('id', id)
  } catch (e) {
    console.warn('endSession failed:', e?.message)
  }
}

/**
 * React hook: keep a heartbeat alive for `user` while they're signed in.
 * Mount once in the AuthProvider. Starts/resumes a session when a user is
 * present, beats every HEARTBEAT_MS while the tab is visible, beats once more
 * when the tab regains focus, and best-effort stamps last_seen on tab close.
 */
export function useSessionTracker(user) {
  const sessionIdRef = useRef(null)

  useEffect(() => {
    if (!user?.auth_user_id) return
    let cancelled = false
    let timer = null

    const beatNow = () => {
      if (document.visibilityState === 'visible') heartbeat(sessionIdRef.current)
    }

    ;(async () => {
      const id = await startOrResumeSession(user)
      if (cancelled) return
      sessionIdRef.current = id
      timer = setInterval(beatNow, HEARTBEAT_MS)
    })()

    const onVisibility = () => { if (document.visibilityState === 'visible') beatNow() }
    // pagehide fires on tab close / navigation away — best-effort final stamp.
    const onPageHide = () => {
      const id = sessionIdRef.current
      if (!id) return
      // keepalive lets the request outlive the page; supabase update under the hood is fetch().
      try {
        supabase.from('user_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', id)
      } catch { /* ignore */ }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [user?.auth_user_id])
}
