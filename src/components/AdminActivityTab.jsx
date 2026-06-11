import { useState, useEffect, useCallback } from 'react'
import { supabase, ROLE_LABELS } from '../lib/supabase'
import {
  Activity, LogIn, Clock, Users, RefreshCw, AlertCircle, Loader2,
  Edit2, Plus, Trash2, FileUp, FileText, CreditCard, ArrowRightLeft, Check, Mail,
} from 'lucide-react'

// How many rows to pull per feed. Plenty for a pilot; bump if needed.
const FEED_LIMIT = 250

// Mirror of the labels used in HistoryTab so the change feed reads consistently.
const ACTION_META = {
  created:             { icon: Plus,           color: '#16a34a', label: 'Created' },
  edit:                { icon: Edit2,          color: '#0088c4', label: 'Edited' },
  merged:              { icon: ArrowRightLeft, color: '#7c3aed', label: 'Merged' },
  document_added:      { icon: FileText,       color: '#16a34a', label: 'Document added' },
  document_deleted:    { icon: Trash2,         color: '#ef4444', label: 'Document deleted' },
  caf_uploaded:        { icon: FileUp,         color: '#16a34a', label: 'CAF uploaded' },
  caf_deleted:         { icon: Trash2,         color: '#ef4444', label: 'CAF deleted' },
  caf_signed_toggled:  { icon: Check,          color: '#16a34a', label: 'CAF signed' },
  payment_updated:     { icon: CreditCard,     color: '#0088c4', label: 'Payment updated' },
  payment_doc_added:   { icon: FileUp,         color: '#16a34a', label: 'Payment document added' },
  payment_doc_deleted: { icon: Trash2,         color: '#ef4444', label: 'Payment document deleted' },
}

function fmtDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// Compact "2 hours ago" style relative label.
function fmtRelative(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.round(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m} min ago`
    const h = Math.round(m / 60)
    if (h < 24) return `${h} hr ago`
    const d = Math.round(h / 24)
    if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
    const mo = Math.round(d / 30)
    return `${mo} month${mo === 1 ? '' : 's'} ago`
  } catch { return '' }
}

export default function AdminActivityTab({ colors }) {
  const [subTab, setSubTab]   = useState('signins')   // 'signins' | 'changes'
  const [logins, setLogins]   = useState([])
  const [changes, setChanges] = useState([])
  const [papMap, setPapMap]   = useState({})          // household_id -> { file_number, name }
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Sign-in events (admin-only SELECT via usage_logs_admin_select policy).
      const loginsQ = supabase
        .from('usage_logs')
        .select('id, user_id, action, metadata, created_at')
        .eq('action', 'login')
        .order('created_at', { ascending: false })
        .limit(FEED_LIMIT)

      // Global change feed across all PAPs (admin reads via existing
      // is_authenticated_cims_user() SELECT policy on pap_audit_log).
      const changesQ = supabase
        .from('pap_audit_log')
        .select('id, household_id, action, changed_fields, edited_by_name, edited_at, source')
        .order('edited_at', { ascending: false })
        .limit(FEED_LIMIT)

      const [{ data: loginRows, error: lErr }, { data: changeRows, error: cErr }] =
        await Promise.all([loginsQ, changesQ])
      if (lErr) throw lErr
      if (cErr) throw cErr

      setLogins(loginRows || [])
      setChanges(changeRows || [])

      // Resolve PAP references for the change feed in one round-trip.
      const ids = [...new Set((changeRows || []).map(r => r.household_id).filter(Boolean))]
      if (ids.length) {
        const { data: paps } = await supabase
          .from('households')
          .select('id, file_number, household_head_first_name, household_head_surname')
          .in('id', ids)
        const map = {}
        ;(paps || []).forEach(p => {
          const name = [p.household_head_first_name, p.household_head_surname].filter(Boolean).join(' ').trim()
          map[p.id] = { file_number: p.file_number, name: name || '(unnamed)' }
        })
        setPapMap(map)
      } else {
        setPapMap({})
      }
    } catch (e) {
      setError(e.message || 'Failed to load activity.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Derived: most recent sign-in per person (logins already sorted desc).
  const lastSeen = []
  {
    const seen = new Set()
    for (const row of logins) {
      const key = (row.metadata?.email || row.metadata?.name || row.user_id || '').toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      lastSeen.push(row)
    }
  }

  const since30 = Date.now() - 30 * 24 * 3600 * 1000
  const logins30 = logins.filter(r => new Date(r.created_at).getTime() >= since30).length

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            backgroundColor: `${colors.primary}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={22} color={colors.primary} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: colors.textDark }}>Activity Log</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: colors.textMuted }}>
              Who signed in, and every change made — across all PAPs.
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
            backgroundColor: colors.bgCard, color: colors.textDark,
            border: `1px solid ${colors.border}`, borderRadius: '10px',
            fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <SummaryCard icon={LogIn}  color={colors.primary} label="Sign-ins (30 days)" value={logins30} colors={colors} />
        <SummaryCard icon={Users}  color="#7c3aed"        label="Distinct people seen" value={lastSeen.length} colors={colors} />
        <SummaryCard icon={Edit2}  color="#0088c4"        label="Recent changes loaded" value={changes.length} colors={colors} />
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '0' }}>
        {[['signins', 'Sign-ins', LogIn], ['changes', 'Changes', Edit2]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setSubTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 16px', border: 'none', background: 'transparent',
              borderBottom: `2px solid ${subTab === id ? colors.primary : 'transparent'}`,
              color: subTab === id ? colors.primary : colors.textMuted,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '-1px',
            }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '8px', color: colors.textMuted }}>
          <Loader2 size={20} className="spin" /> <span>Loading activity…</span>
        </div>
      ) : subTab === 'signins' ? (
        <SignInsView logins={logins} lastSeen={lastSeen} colors={colors} />
      ) : (
        <ChangesView changes={changes} papMap={papMap} colors={colors} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  )
}

function SummaryCard({ icon: Icon, color, label, value, colors }) {
  return (
    <div style={{
      backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
      borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: '10px', backgroundColor: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: colors.textDark, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: colors.textMuted }}>{label}</div>
      </div>
    </div>
  )
}

function SignInsView({ logins, lastSeen, colors }) {
  if (logins.length === 0) {
    return <Empty colors={colors} text="No sign-ins recorded yet. New logins will appear here as staff sign in." />
  }
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Last seen per person */}
      <Panel title="Last seen by person" subtitle={`${lastSeen.length} people`} icon={Users} colors={colors}>
        <div style={{ display: 'grid', gap: '8px' }}>
          {lastSeen.map(row => (
            <div key={row.id} style={rowStyle(colors)}>
              <Avatar name={row.metadata?.name} colors={colors} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, color: colors.textDark, fontSize: '14px' }}>
                  {row.metadata?.name || 'Unknown'}
                  {row.metadata?.role && (
                    <span style={{ fontWeight: 500, color: colors.textMuted, fontSize: '12px' }}>
                      {' '}· {ROLE_LABELS[(row.metadata.role || '').toLowerCase()] || row.metadata.role}
                    </span>
                  )}
                </div>
                {row.metadata?.email && (
                  <div style={{ fontSize: '12px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail size={11} /> {row.metadata.email}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '13px', color: colors.textDark }}>{fmtRelative(row.created_at)}</div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>{fmtDateTime(row.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Full chronological sign-in feed */}
      <Panel title="All sign-ins" subtitle={`${logins.length} most recent`} icon={Clock} colors={colors}>
        <div style={{ display: 'grid', gap: '6px' }}>
          {logins.map(row => (
            <div key={row.id} style={rowStyle(colors)}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', backgroundColor: `${colors.primary}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogIn size={15} color={colors.primary} />
              </div>
              <div style={{ minWidth: 0, flex: 1, fontSize: '13px', color: colors.textDark }}>
                <strong>{row.metadata?.name || 'Unknown'}</strong> signed in
                {row.metadata?.via === 'email_link' ? ' via email link' : ''}
              </div>
              <div style={{ fontSize: '12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDateTime(row.created_at)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function ChangesView({ changes, papMap, colors }) {
  if (changes.length === 0) {
    return <Empty colors={colors} text="No changes recorded yet. Edits, uploads, merges and payment updates will appear here." />
  }
  return (
    <Panel title="Recent changes" subtitle={`${changes.length} most recent, across all PAPs`} icon={Edit2} colors={colors}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
        {changes.map(row => {
          const meta = ACTION_META[row.action] || { icon: Clock, color: colors.textMuted, label: row.action }
          const Icon = meta.icon
          const pap = papMap[row.household_id]
          const nFields = row.changed_fields && typeof row.changed_fields === 'object'
            ? Object.keys(row.changed_fields).filter(k => k !== '_action').length : 0
          return (
            <li key={row.id} style={rowStyle(colors)}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `${meta.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={16} color={meta.color} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '13px', color: colors.textDark, lineHeight: 1.5 }}>
                  <strong>{meta.label}</strong>
                  {(row.action === 'edit' && nFields > 0) ? ` · ${nFields} field${nFields === 1 ? '' : 's'}` : ''}
                  <span style={{ color: colors.textMuted }}> by </span>
                  <strong>{row.edited_by_name || 'Unknown'}</strong>
                </div>
                <div style={{ fontSize: '12px', color: colors.textMuted }}>
                  {pap ? <>File {pap.file_number || '—'} · {pap.name}</> : <span style={{ fontStyle: 'italic' }}>PAP reference unavailable</span>}
                  {row.source && row.source !== 'dashboard' ? ` · ${row.source}` : ''}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDateTime(row.edited_at)}</div>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

function Panel({ title, subtitle, icon: Icon, colors, children }) {
  return (
    <div style={{ backgroundColor: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Icon size={18} color={colors.primary} />
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: colors.textDark }}>{title}</h3>
          {subtitle && <p style={{ margin: '1px 0 0 0', fontSize: '12px', color: colors.textMuted }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Avatar({ name, colors }) {
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{
      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark || colors.primary} 100%)`,
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 700,
    }}>{initials}</div>
  )
}

function Empty({ text, colors }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 16px', color: colors.textMuted, fontSize: '14px',
      backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px',
    }}>
      {text}
    </div>
  )
}

function rowStyle(colors) {
  return {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', backgroundColor: colors.bgLight,
    border: `1px solid ${colors.border}`, borderRadius: '10px',
  }
}
