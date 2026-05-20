import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Edit2, FileText, FileUp, CreditCard, Plus, Trash2, Check, ArrowRightLeft, AlertCircle, Loader2 } from 'lucide-react'

// Friendly labels for fields shown in edit diffs.
const FIELD_LABELS = {
  household_head_first_name: 'First Name',
  household_head_surname:    'Surname',
  gender:                    'Gender',
  id_number:                 'ID Number',
  cellphone_no:              'Phone',
  file_number:               'File Number',
  occupation_of_pap:         'Occupation',
  community_council:         'Community Council',
  original_village:          'Original Village',
  current_village:           'Current Village',
  photograph_of_pap_url:     'Photograph',
  id_document_url:           'ID Document',
  asset_photo_url:           'Asset Photo',
  map_url:                   'Map',
  verification_status:       'Verification Status',
  route_name:                'Route',
  route_type:                'Route Type',
  land_use:                  'Land Use',
  gps_coordinates:           'GPS Coordinates',
  latitude:                  'Latitude',
  longitude:                 'Longitude',
  affected_area_perm:        'Affected Area (Perm)',
  affected_area_temp:        'Affected Area (Temp)',
  rate_perm:                 'Rate (Perm)',
  rate_temp:                 'Rate (Temp)',
  disturbance_allowance:     'Disturbance Allowance',
  total_compensation:        'Total Compensation',
  land_assets_json:          'Land Assets',
  payment_status:            'Payment Status',
  paid_amount:               'Paid Amount',
  paid_at:                   'Paid On',
  payment_reference:         'Payment Reference',
}

// Icon + label per audit action.
const ACTION_META = {
  created:                { icon: Plus,          color: '#16a34a', label: 'Created' },
  edit:                   { icon: Edit2,         color: '#0088c4', label: 'Edited' },
  merged:                 { icon: ArrowRightLeft, color: '#7c3aed', label: 'Merged' },
  document_added:         { icon: FileText,      color: '#16a34a', label: 'Document added' },
  document_deleted:       { icon: Trash2,        color: '#ef4444', label: 'Document deleted' },
  caf_uploaded:           { icon: FileUp,        color: '#16a34a', label: 'CAF uploaded' },
  caf_deleted:            { icon: Trash2,        color: '#ef4444', label: 'CAF deleted' },
  caf_signed_toggled:     { icon: Check,         color: '#16a34a', label: 'CAF signed' },
  payment_updated:        { icon: CreditCard,    color: '#0088c4', label: 'Payment updated' },
  payment_doc_added:      { icon: FileUp,        color: '#16a34a', label: 'Payment document added' },
  payment_doc_deleted:    { icon: Trash2,        color: '#ef4444', label: 'Payment document deleted' },
}

function fmtValue(v) {
  if (v === null || v === undefined || v === '') return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>empty</span>
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function fmtDate(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export default function HistoryTab({ household, colors }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!household?.id) return
    let cancelled = false
    setLoading(true); setError('')
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('pap_audit_log')
          .select('*')
          .eq('household_id', household.id)
          .order('edited_at', { ascending: false })
          .limit(500)
        if (error) throw error
        if (!cancelled) setRows(data || [])
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load history.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [household?.id])

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{
        backgroundColor: colors.bgCard,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            backgroundColor: `${colors.primary}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={20} color={colors.primary} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: colors.textDark }}>Change History</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: colors.textMuted }}>
              {loading ? 'Loading…' : `${rows.length} event${rows.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: '8px', color: colors.textMuted }}>
            <Loader2 size={20} className="spin" />
            <span>Loading change history…</span>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: colors.textMuted, fontSize: '14px' }}>
            No changes recorded yet. Any edits, document uploads, or payment updates will appear here.
          </div>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' }}>
            {rows.map(row => (
              <HistoryRow key={row.id} row={row} colors={colors} />
            ))}
          </ol>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  )
}

function HistoryRow({ row, colors }) {
  const meta = ACTION_META[row.action] || { icon: Clock, color: colors.textMuted, label: row.action }
  const Icon = meta.icon

  return (
    <li style={{
      display: 'grid',
      gridTemplateColumns: '36px 1fr',
      gap: '12px',
      padding: '14px 16px',
      backgroundColor: colors.bgLight,
      border: `1px solid ${colors.border}`,
      borderRadius: '10px',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        backgroundColor: `${meta.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} color={meta.color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: colors.textDark, fontSize: '14px' }}>{meta.label}</span>
            <span style={{ color: colors.textMuted, fontSize: '13px' }}> by </span>
            <span style={{ fontWeight: 600, color: colors.textDark, fontSize: '14px' }}>{row.edited_by_name || 'Unknown'}</span>
          </div>
          <span style={{ fontSize: '12px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(row.edited_at)}</span>
        </div>
        <ChangeSummary row={row} colors={colors} />
      </div>
    </li>
  )
}

function ChangeSummary({ row, colors }) {
  const fields = row.changed_fields || {}

  if (row.action === 'edit' || row.action === 'created') {
    const entries = Object.entries(fields).filter(([k]) => k !== '_action')
    if (entries.length === 0) return <span style={{ fontSize: '12px', color: colors.textMuted }}>No field details recorded.</span>
    return (
      <ul style={{ listStyle: 'none', margin: '4px 0 0 0', padding: 0, display: 'grid', gap: '4px' }}>
        {entries.map(([field, change]) => (
          <li key={field} style={{ fontSize: '13px', color: colors.textDark, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600 }}>{FIELD_LABELS[field] || field}</span>
            {change && typeof change === 'object' && 'old' in change ? (
              <>
                {': '}
                <span style={{ color: colors.textMuted, textDecoration: 'line-through' }}>{fmtValue(change.old)}</span>
                {' → '}
                <span style={{ color: colors.success }}>{fmtValue(change.new)}</span>
              </>
            ) : (
              <>{': '}<span style={{ color: colors.success }}>{fmtValue(change)}</span></>
            )}
          </li>
        ))}
      </ul>
    )
  }

  if (row.action === 'payment_updated') {
    const entries = Object.entries(fields)
    return (
      <ul style={{ listStyle: 'none', margin: '4px 0 0 0', padding: 0, display: 'grid', gap: '4px' }}>
        {entries.map(([field, change]) => (
          <li key={field} style={{ fontSize: '13px', color: colors.textDark }}>
            <span style={{ fontWeight: 600 }}>{FIELD_LABELS[field] || field}</span>{': '}
            <span style={{ color: colors.textMuted, textDecoration: 'line-through' }}>{fmtValue(change.old)}</span>
            {' → '}
            <span style={{ color: colors.success }}>{fmtValue(change.new)}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (row.action === 'merged') {
    return (
      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textDark }}>
        Merged in <strong>{fields.loser_name || '(unnamed)'}</strong>
        {fields.loser_file_no ? ` (file ${fields.loser_file_no})` : ''}
        {fields.loser_route   ? ` from ${fields.loser_route}` : ''}.
      </p>
    )
  }

  // Document / CAF / payment-doc actions all just have { name } and maybe { signed }.
  if ('name' in fields) {
    return (
      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textDark }}>
        <strong>{fields.name}</strong>
      </p>
    )
  }

  if (row.action === 'caf_signed_toggled') {
    return (
      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textDark }}>
        CAF marked as <strong>{fields.signed ? 'signed & verified' : 'awaiting signature'}</strong>.
      </p>
    )
  }

  return null
}
