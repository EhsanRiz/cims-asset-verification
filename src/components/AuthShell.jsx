// Shared visual shell for all auth pages (Login, Register, ForgotPassword, ResetPassword).
// Keeps the logos, gradient background, footer in one place.
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #0088c4 0%, #005a7c 50%, #003d54 100%)',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '440px',
        overflow: 'hidden',
      }}>
        {/* Partner Logos */}
        <div style={{
          padding: '24px 32px 16px 32px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <img src="/logo-lesotho.png" alt="Government of Lesotho" style={{ height: '50px', objectFit: 'contain' }} />
            <img src="/logo-llwdp.png" alt="LLWDSP III" style={{ height: '50px', objectFit: 'contain' }} />
            <img src="/logo-afdb.png" alt="African Development Bank" style={{ height: '45px', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Title */}
        <div style={{ padding: '24px 32px 8px 32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0088c4', margin: '0 0 4px 0' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{subtitle}</p>
          )}
        </div>

        {/* Page body */}
        <div style={{ padding: '16px 32px 32px 32px' }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #f3f4f6',
          padding: '20px 32px',
          textAlign: 'center',
          backgroundColor: '#fafafa',
        }}>
          <img src="/logo-4d.png" alt="4D Climate Solutions" style={{ height: '28px', marginBottom: '8px' }} />
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Developed by <span style={{ color: '#0088c4', fontWeight: '600' }}>4D Climate Solutions</span>
          </p>
          <p style={{ fontSize: '11px', color: '#d1d5db', marginTop: '4px' }}>© 2026 · LLWDSP III</p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
