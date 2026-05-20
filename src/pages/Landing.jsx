import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Users, LogOut, MapPin, Database, Bell } from 'lucide-react'
import { useAuth } from '../App'
import { supabase, ROLE_LABELS } from '../lib/supabase'

const colors = {
  primary: '#1a3a4a',
  accent: '#8cc63f',
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
}

export default function Landing() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  // Approvers: admins + Mamokuena (legacy role='user' override) + editor roles from the GRM role system.
  const _r = (user?.role || '').toLowerCase()
  const isApprover =
    _r === 'admin' ||
    ['clo', 'arco', 'rco', 'essm'].includes(_r) ||
    (user?.full_name || '').toLowerCase().includes('mamokuena') ||
    (user?.username || '').toLowerCase().includes('mamokuena')

  useEffect(() => {
    if (!isApprover) return
    let active = true
    const loadCount = async () => {
      const { count } = await supabase
        .from('households')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending')
        .not('created_by_user', 'is', null)
      if (active && typeof count === 'number') setPendingCount(count)
    }
    loadCount()
    // Live refresh so the badge stays current without a manual reload
    const ch = supabase
      .channel('landing-pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'households' }, loadCount)
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [isApprover])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: colors.primary,
        color: '#fff',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: colors.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: colors.primary,
            fontSize: 18,
          }}>
            CIMS
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Compensation Information Management System
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              LLWDP III — Field Team Portal
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right', fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{user?.full_name || user?.username}</div>
            <div style={{ opacity: 0.8, fontSize: 11, textTransform: 'uppercase' }}>
              {ROLE_LABELS[(user?.role || '').toLowerCase()] || user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{
        flex: 1,
        maxWidth: 1000,
        width: '100%',
        margin: '0 auto',
        padding: '40px 24px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, color: colors.primary, margin: '0 0 8px', fontWeight: 700 }}>
            Welcome, {user?.full_name?.split(' ')[0] || user?.username}
          </h1>
          <p style={{ color: colors.muted, fontSize: 15, margin: 0 }}>
            What would you like to do today?
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}>
          {/* Register new PAP */}
          <button
            onClick={() => navigate('/collect')}
            style={{
              background: colors.card,
              border: `2px solid ${colors.border}`,
              borderRadius: 12,
              padding: '32px 24px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              minHeight: 240,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.accent
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: `${colors.accent}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ClipboardList size={28} color={colors.accent} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{
                fontSize: 20,
                color: colors.primary,
                margin: '0 0 6px',
                fontWeight: 700,
              }}>
                Register a New PAP
              </h2>
              <p style={{ color: colors.muted, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                Capture a new Project Affected Person in the field — household details, assets, beneficiaries, co-owners and banking.
              </p>
            </div>
            <div style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: colors.accent,
              fontSize: 13,
              fontWeight: 600,
            }}>
              Start collection <span style={{ fontSize: 16 }}>→</span>
            </div>
          </button>

          {/* View / update existing PAPs */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: colors.card,
              border: `2px solid ${colors.border}`,
              borderRadius: 12,
              padding: '32px 24px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              minHeight: 240,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.primary
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: `${colors.primary}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Database size={28} color={colors.primary} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{
                fontSize: 20,
                color: colors.primary,
                margin: '0 0 6px',
                fontWeight: 700,
              }}>
                View / Update Existing PAPs
              </h2>
              <p style={{ color: colors.muted, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                Browse the full PAP database by route, add documents to existing records, and update household information.
              </p>
              {isApprover && pendingCount > 0 && (
                <div style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  <Bell size={12} />
                  {pendingCount} pending approval{pendingCount === 1 ? '' : 's'}
                </div>
              )}
            </div>
            <div style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: colors.primary,
              fontSize: 13,
              fontWeight: 600,
            }}>
              Open database <span style={{ fontSize: 16 }}>→</span>
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div style={{
          marginTop: 48,
          padding: 16,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          color: colors.muted,
        }}>
          <MapPin size={16} color={colors.accent} />
          <span>
            New registrations are saved as <strong style={{ color: colors.text }}>Pending</strong> and reviewed by the project office before being published.
          </span>
        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        padding: 16,
        fontSize: 12,
        color: colors.muted,
      }}>
        © 4D Climate Solutions · LLWDP III Compensation Information Management System
      </footer>
    </div>
  )
}
