import Link from 'next/link'

export default function JoinPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#1A1814', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#F5F2ED', fontSize: '32px', fontWeight: '700', lineHeight: '1.2', marginBottom: '12px' }}>Welcome to XFG</h1>
          <p style={{ color: '#9A9890', fontSize: '16px', fontStyle: 'italic', lineHeight: '1.6' }}>Build a successful business with everything provided for you.</p>
        </div>

        <div style={{ background: '#242220', border: '1px solid #2E2C29', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>What We Provide</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { title: 'Fully Remote', desc: 'Work from anywhere in the country' },
              { title: 'Daily Training', desc: 'Learn and grow with the team every day' },
              { title: 'Free Leads', desc: 'We provide the leads — you focus on closing' },
              { title: 'Free Dialer', desc: 'No out of pocket costs for your dialer' },
              { title: '$2,000 Worth of Software', desc: 'Industry leading tools included at no cost' },
              { title: 'Live Support', desc: 'Never left on your own — we are with you every step' },
              { title: 'Unmatched Training & Supported System', desc: 'A proven system designed to help you reach your goals' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A96E', flexShrink: 0, marginTop: '7px' }} />
                <div>
                  <p style={{ color: '#F5F2ED', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>{item.title}</p>
                  <p style={{ color: '#9A9890', fontSize: '13px' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link href="/signup" style={{ display: 'block', width: '100%', background: '#C9A96E', color: '#FFFFFF', textAlign: 'center', padding: '18px', borderRadius: '12px', textDecoration: 'none', fontSize: '17px', fontWeight: '700', letterSpacing: '0.03em', marginBottom: '14px', fontFamily: 'Inter, sans-serif' }}>
          Get Started — Create Your Account
        </Link>

        <p style={{ textAlign: 'center', color: '#5C5A56', fontSize: '14px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#C9A96E', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </main>
  )
}
