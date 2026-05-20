import { useState, useEffect, useMemo } from 'react'
import { supabase, ROLE_LABELS, EDITOR_ROLES, VIEW_ONLY_ROLES } from '../lib/supabase'
import {
  Users, Plus, Search, Pencil, AlertCircle, X, Loader2,
  CheckCircle, Clock, ShieldOff, UserCheck,
} from 'lucide-react'

// All roles that admin is allowed to assign, in display order.
const ASSIGNABLE_ROLES = [
  'admin', 'user', 'clo', 'arco', 'rco', 'essm',
  'assistant_clo', 'pm', 'ict_dmo', 'client',
]

function roleLevel(role) {
  if (role === 'admin') return 'Admin'
  if (EDITOR_ROLES.has(role)) return 'Editor'
  if (VIEW_ONLY_ROLES.has(role)) return 'View only'
  return '—'
}

// Merge authorized_emails with system_users by email.
function mergeRows(authorizedRows, profileRows) {
  const byEmail = new Map()
  for (const p of profileRows || []) {
    if (p?.email) byEmail.set(p.email.toLowerCase(), p)
  }
  return (authorizedRows || []).map(row => {
    const profile = byEmail.get((row.email || '').toLowerCase())
    return {
      email:         row.email,
      full_name:     row.full_name,
      job_title:     row.job_title || '',
      role:          row.role,
      invited_at:    row.invited_at,
      registered_at: row.registered_at,
      notes:         row.notes || '',
      profile_id:    profile?.id || null,
      is_active:     profile?.is_active ?? null,
      has_auth_user: !!profile?.auth_user_id,
    }
  })
}

export default function StaffManagement({ colors, currentUserEmail }) {
  const [rows, setRows]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [searchQuery, setSearchQuery]   = useState('')
  const [editing, setEditing]           = useState(null)   // row being edited
  const [adding, setAdding]             = useState(false)  // Add Staff modal
  const [busyEmail, setBusyEmail]       = useState(null)   // row currently mid-action

  const loadAll = async () => {
    setLoading(true); setError('')
    try {
      const [{ data: ae, error: aeErr }, { data: su, error: suErr }] = await Promise.all([
        supabase.from('authorized_emails').select('*').order('role').order('full_name'),
        supabase.from('system_users').select('id, email, is_active, auth_user_id'),
      ])
      if (aeErr) throw aeErr
      if (suErr) throw suErr
      setRows(mergeRows(ae, su))
    } catch (err) {
      console.error('StaffManagement load failed:', err)
      setError(err.message || 'Failed to load staff list.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadAll() }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      (r.email     || '').toLowerCase().includes(q) ||
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.job_title || '').toLowerCase().includes(q) ||
      (ROLE_LABELS[r.role] || r.role || '').toLowerCase().includes(q)
    )
  }, [rows, searchQuery])

  // ─────── Actions ───────

  const toggleActive = async (row) => {
    if (!row.profile_id) return
    const next = !row.is_active
    const verb = next ? 'activate' : 'deactivate'
    if (!confirm(`${next ? 'Activate' : 'Deactivate'} ${row.full_name}?`)) return
    setBusyEmail(row.email)
    try {
      const { error: e } = await supabase
        .from('system_users')
        .update({ is_active: next, updated_at: new Date().toISOString() })
        .eq('id', row.profile_id)
      if (e) throw e
      await loadAll()
    } catch (err) {
      alert(`Could not ${verb} this user: ${err.message || err}`)
    } finally {
      setBusyEmail(null)
    }
  }

  const revokeInvite = async (row) => {
    if (row.profile_id) return  // only valid for pre-registered rows
    if (row.email?.toLowerCase() === (currentUserEmail || '').toLowerCase()) {
      alert("You can't revoke your own invite.")
      return
    }
    if (!confirm(`Revoke invite for ${row.email}?\n\nThey will no longer be able to register.`)) return
    setBusyEmail(row.email)
    try {
      const { error: e } = await supabase
        .from('authorized_emails')
        .delete()
        .eq('email', row.email)
      if (e) throw e
      await loadAll()
    } catch (err) {
      alert(`Could not revoke invite: ${err.message || err}`)
    } finally {
      setBusyEmail(null)
    }
  }

  // ─────── Render ───────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header card */}
      <div style={{
        backgroundColor: colors.bgCard,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={22} color={colors.primary} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: colors.textDark }}>
            Staff Management
          </h2>
          <span style={{ fontSize: '13px', color: colors.textMuted }}>
            {rows.length} {rows.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <button onClick={() => setAdding(true)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 16px',
          backgroundColor: colors.primary,
          color: 'white', border: 'none', borderRadius: '8px',
          fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Search */}
      <div style={{
        backgroundColor: colors.bgCard,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <Search size={18} color={colors.textMuted} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, title, or role…"
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: '14px', backgroundColor: 'transparent',
            color: colors.textDark,
          }}
        />
      </div>

      {/* Errors */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '12px 16px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
        }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div style={{
        backgroundColor: colors.bgCard,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: colors.textMuted, gap: '8px' }}>
            <Loader2 size={20} className="spinning" />
            <span>Loading staff…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: colors.textMuted, fontSize: '14px' }}>
            {searchQuery ? 'No staff match your search.' : 'No staff yet. Add the first one above.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: colors.bgLight, color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Title</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Activated</Th>
                  <Th style={{ textAlign: 'right' }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <StaffRow
                    key={row.email}
                    row={row}
                    colors={colors}
                    busy={busyEmail === row.email}
                    onEdit={() => setEditing(row)}
                    onToggleActive={() => toggleActive(row)}
                    onRevoke={() => revokeInvite(row)}
                    isSelf={row.email?.toLowerCase() === (currentUserEmail || '').toLowerCase()}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <StaffModal
          mode="add"
          colors={colors}
          onClose={() => setAdding(false)}
          onSaved={async () => { setAdding(false); await loadAll() }}
        />
      )}

      {editing && (
        <StaffModal
          mode="edit"
          colors={colors}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await loadAll() }}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spinning { animation: spin 1s linear infinite; }`}</style>
    </div>
  )
}

function Th({ children, style }) {
  return (
    <th style={{
      textAlign: 'left',
      padding: '12px 16px',
      fontWeight: 600,
      borderBottom: '1px solid #e2e8f0',
      ...style,
    }}>{children}</th>
  )
}

function StaffRow({ row, colors, busy, onEdit, onToggleActive, onRevoke, isSelf }) {
  const registered = !!row.registered_at
  const statusBadge = !registered
    ? { bg: '#fef3c7', fg: '#92400e', label: 'Pending' }
    : row.is_active === false
      ? { bg: '#fee2e2', fg: '#991b1b', label: 'Inactive' }
      : { bg: '#dcfce7', fg: '#166534', label: 'Active' }

  const activatedBadge = registered
    ? { bg: '#dbeafe', fg: '#1e40af', icon: <CheckCircle size={14} />, label: 'Registered' }
    : { bg: '#fef3c7', fg: '#92400e', icon: <Clock size={14} />, label: 'Pending' }

  const editLabel = ROLE_LABELS[row.role] || row.role || '—'

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={tdStyle(colors)}>
        <div style={{ fontWeight: 600, color: colors.textDark }}>{row.full_name || '—'}</div>
        {isSelf && <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>You</div>}
      </td>
      <td style={tdStyle(colors)}><span style={{ color: colors.textMuted }}>{row.email}</span></td>
      <td style={tdStyle(colors)}><span style={{ color: colors.textMuted }}>{row.job_title || '—'}</span></td>
      <td style={tdStyle(colors)}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 500, color: colors.textDark }}>{editLabel}</span>
          <span style={{ fontSize: '11px', color: colors.textMuted }}>{roleLevel(row.role)}</span>
        </div>
      </td>
      <td style={tdStyle(colors)}><Pill bg={statusBadge.bg} fg={statusBadge.fg}>{statusBadge.label}</Pill></td>
      <td style={tdStyle(colors)}>
        <Pill bg={activatedBadge.bg} fg={activatedBadge.fg}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{activatedBadge.icon} {activatedBadge.label}</span>
        </Pill>
      </td>
      <td style={{ ...tdStyle(colors), textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button onClick={onEdit} disabled={busy} style={btnOutline(colors)}>
          <Pencil size={14} /> Edit
        </button>
        {registered ? (
          row.is_active === false ? (
            <button onClick={onToggleActive} disabled={busy} style={btnFilled('#16a34a')}>
              <UserCheck size={14} /> Activate
            </button>
          ) : (
            <button onClick={onToggleActive} disabled={busy || isSelf} style={btnFilled(isSelf ? '#9ca3af' : '#f59e0b')} title={isSelf ? "You can't deactivate yourself" : ''}>
              <ShieldOff size={14} /> Deactivate
            </button>
          )
        ) : (
          <button onClick={onRevoke} disabled={busy || isSelf} style={btnFilled(isSelf ? '#9ca3af' : '#ef4444')} title={isSelf ? "You can't revoke your own invite" : 'Remove from allow-list'}>
            <X size={14} /> Revoke
          </button>
        )}
      </td>
    </tr>
  )
}

function tdStyle(colors) {
  return { padding: '14px 16px', verticalAlign: 'middle', fontSize: '14px' }
}

function Pill({ bg, fg, children }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '999px',
      backgroundColor: bg,
      color: fg,
      fontSize: '12px',
      fontWeight: 600,
    }}>{children}</span>
  )
}

function btnOutline(colors) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', marginRight: '6px',
    backgroundColor: 'white',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.textDark,
    fontSize: '13px', fontWeight: 600,
    cursor: 'pointer',
  }
}
function btnFilled(bg) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px',
    backgroundColor: bg,
    border: 'none', borderRadius: '6px',
    color: 'white',
    fontSize: '13px', fontWeight: 600,
    cursor: 'pointer',
  }
}

// ─────────────────────────────────────────────────────────────
// Add / Edit modal
// ─────────────────────────────────────────────────────────────

function StaffModal({ mode, row, colors, onClose, onSaved }) {
  const isEdit = mode === 'edit'
  const [email,     setEmail]     = useState(row?.email     || '')
  const [fullName,  setFullName]  = useState(row?.full_name || '')
  const [jobTitle,  setJobTitle]  = useState(row?.job_title || '')
  const [role,      setRole]      = useState(row?.role      || 'assistant_clo')
  const [notes,     setNotes]     = useState(row?.notes     || '')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!email.trim() || !fullName.trim()) { setErr('Email and full name are required.'); return }
    if (!ASSIGNABLE_ROLES.includes(role))  { setErr('Pick a valid role.'); return }

    setSaving(true)
    try {
      const emailNorm = email.trim().toLowerCase()
      if (isEdit) {
        const { error: e1 } = await supabase
          .from('authorized_emails')
          .update({ full_name: fullName.trim(), job_title: jobTitle.trim() || null, role, notes: notes.trim() || null })
          .eq('email', row.email)
        if (e1) throw e1
        // Propagate role + name to system_users if a profile already exists.
        if (row.profile_id) {
          const { error: e2 } = await supabase
            .from('system_users')
            .update({ full_name: fullName.trim(), role, updated_at: new Date().toISOString() })
            .eq('id', row.profile_id)
          if (e2) throw e2
        }
      } else {
        const { error: e1 } = await supabase
          .from('authorized_emails')
          .insert({ email: emailNorm, full_name: fullName.trim(), job_title: jobTitle.trim() || null, role, notes: notes.trim() || null })
        if (e1) {
          if (e1.code === '23505') throw new Error('That email is already on the allow-list.')
          throw e1
        }
      }
      await onSaved()
    } catch (e) {
      setErr(e.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '16px',
    }}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} style={{
        backgroundColor: 'white', borderRadius: '14px',
        width: '100%', maxWidth: '480px', padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: colors.textDark }}>
            {isEdit ? 'Edit staff member' : 'Add staff member'}
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {err && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} /> <span>{err}</span>
          </div>
        )}

        <Field label="Email *">
          <input
            type="email"
            value={email}
            disabled={isEdit}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle(isEdit)}
            placeholder="name@example.com"
            required
          />
        </Field>

        <Field label="Full name *">
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            style={inputStyle(false)}
            required
          />
        </Field>

        <Field label="Job title">
          <input
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            style={inputStyle(false)}
            placeholder="e.g. Assistant CLO"
          />
        </Field>

        <Field label="Role *">
          <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle(false)}>
            {ASSIGNABLE_ROLES.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r] || r} ({roleLevel(r).toLowerCase()})</option>
            ))}
          </select>
        </Field>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle(false), resize: 'vertical', minHeight: '56px' }}
            placeholder="Optional"
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} disabled={saving} style={btnOutline(colors)}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...btnFilled(colors.primary), padding: '8px 16px' }}>
            {saving ? <Loader2 size={14} className="spinning" /> : (isEdit ? 'Save changes' : 'Add staff')}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: '12px' }}>
      <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{label}</span>
      {children}
    </label>
  )
}
function inputStyle(disabled) {
  return {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: disabled ? '#f3f4f6' : '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    color: disabled ? '#6b7280' : '#1f2937',
  }
}
