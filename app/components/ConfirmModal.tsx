'use client'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ isOpen, title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26,24,20,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <p style={{ fontSize: '17px', fontWeight: '700', color: '#1A1814', margin: '0 0 8px 0' }}>{title}</p>
        <p style={{ fontSize: '14px', color: '#6B6966', margin: '0 0 24px 0', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '11px', backgroundColor: '#F4F1EB', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '11px', backgroundColor: danger ? '#C0392B' : '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
