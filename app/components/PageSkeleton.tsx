'use client'

export default function PageSkeleton() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <style>{`
        @keyframes xfgShimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .xfg-skel {
          background: linear-gradient(90deg, #EFEBE3 25%, #F7F4EE 37%, #EFEBE3 63%);
          background-size: 800px 100%;
          animation: xfgShimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>

      <div className="xfg-skel" style={{ width: '220px', height: '28px', marginBottom: '10px' }} />
      <div className="xfg-skel" style={{ width: '340px', height: '14px', marginBottom: '28px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="xfg-skel" style={{ height: '84px' }} />
        ))}
      </div>

      <div className="xfg-skel" style={{ height: '160px', marginBottom: '16px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="xfg-skel" style={{ height: '52px' }} />
        ))}
      </div>
    </div>
  )
}
