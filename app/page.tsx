import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '2.2rem', fontFamily: 'Georgia, serif', fontWeight: '400', lineHeight: '1.2', marginBottom: '0.75rem' }}>Agent Platform</h1>
          <p style={{ color: '#6B6966', fontSize: '0.95rem', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Built for producers who refuse to be average.</p>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/login" style={{ display: 'block', width: '100%', background: '#C9A96E', color: '#FFFFFF', fontFamily: 'Georgia, serif', fontWeight: '600', fontSize: '1rem', padding: '0.875rem', borderRadius: '8px', textDecoration: 'none', letterSpacing: '0.03em' }}>
              Sign In
            </Link>
            <Link href="/signup" style={{ display: 'block', width: '100%', background: 'transparent', color: '#1A1814', border: '1px solid #DDD9D2', fontFamily: 'Georgia, serif', fontSize: '1rem', padding: '0.875rem', borderRadius: '8px', textDecoration: 'none', letterSpacing: '0.03em' }}>
              Create Account
            </Link>
          </div>
          <p style={{ color: '#9A9890', fontSize: '0.8rem', marginTop: '1.5rem', fontFamily: 'Georgia, serif' }}>
            All 50 States · Licensed Producers & Applicants
          </p>
        </div>
      </div>
    </main>
  )
}
