'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCRMClient, createCRMPolicy } from '@/app/_actions/crm-actions'
import {
  CARRIERS,
  PRODUCT_TYPES,
  POLICY_STATUSES,
  HEALTH_STATUSES,
  US_STATES,
} from '@/app/crm-constants'

type Step = 'client' | 'policy' | 'done'

export default function NewClientPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('client')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)
  const [skipPolicy, setSkipPolicy] = useState(false)

  const [client, setClient] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    zip: '',
    health_status: '',
    tobacco_user: false,
    health_notes: '',
    notes: '',
  })

  const [policy, setPolicy] = useState({
    carrier: '',
    product_type: '',
    policy_number: '',
    face_amount: '',
    monthly_premium: '',
    annual_premium: '',
    date_written: new Date().toISOString().split('T')[0],
    effective_date: '',
    status: 'pending',
    notes: '',
  })

  const updateClient = (field: string, value: string | boolean) =>
    setClient(prev => ({ ...prev, [field]: value }))

  const updatePolicy = (field: string, value: string) =>
    setPolicy(prev => ({ ...prev, [field]: value }))

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!client.first_name.trim() || !client.last_name.trim()) {
      setError('First and last name are required.')
      return
    }
    setLoading(true)
    try {
      const result = await createCRMClient({
        ...client,
        health_status: client.health_status as any || undefined,
        date_of_birth: client.date_of_birth || undefined,
        email: client.email || undefined,
        phone: client.phone || undefined,
      })
      if (result.error) { setError(result.error); return }
      setCreatedClientId(result.data?.id ?? null)
      setStep('policy')
    } finally {
      setLoading(false)
    }
  }

  async function handlePolicySubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!createdClientId) return
    if (!policy.carrier || !policy.product_type) {
      setError('Carrier and product type are required.')
      return
    }
    setLoading(true)
    try {
      const result = await createCRMPolicy({
        client_id: createdClientId,
        carrier: policy.carrier,
        product_type: policy.product_type,
        policy_number: policy.policy_number || undefined,
        face_amount: policy.face_amount ? Number(policy.face_amount) : undefined,
        monthly_premium: policy.monthly_premium ? Number(policy.monthly_premium) : undefined,
        annual_premium: policy.annual_premium ? Number(policy.annual_premium) : undefined,
        date_written: policy.date_written,
        effective_date: policy.effective_date || undefined,
        status: policy.status,
        notes: policy.notes || undefined,
      })
      if (result.error) { setError(result.error); return }
      setStep('done')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { key: 'client', label: '1. Client Info' },
    { key: 'policy', label: '2. Policy Details' },
    { key: 'done',   label: '3. Complete' },
  ]

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '24px', fontWeight: '700', color: '#1A1A1A',
          letterSpacing: '-0.02em', marginBottom: '4px',
        }}>
          Add New Client
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          Log a new client and their policy details
        </p>
      </div>

      {/* Step Progress */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        {steps.map((s, i) => {
          const isActive = s.key === step
          const isDone = (step === 'policy' && s.key === 'client') ||
                         (step === 'done' && s.key !== 'done')
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'initial' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', flexShrink: 0,
                  backgroundColor: isDone ? '#C9A96E' : isActive ? '#1A1A1A' : '#E5E1DA',
                  color: isDone || isActive ? '#FFF' : '#AAA',
                }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? '#1A1A1A' : isDone ? '#C9A96E' : '#AAA',
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div style={{
                  flex: 1, height: '1px', margin: '0 12px',
                  backgroundColor: isDone ? '#C9A96E' : '#E5E1DA',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', backgroundColor: '#FEE2E2',
          border: '1px solid #FECACA', borderRadius: '8px',
          color: '#C0392B', fontSize: '13px', marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {/* STEP 1 — CLIENT INFO */}
      {step === 'client' && (
        <form onSubmit={handleClientSubmit}>
          <Card title="Personal Information">
            <div style={grid2}>
              <Field label="First Name *">
                <Input value={client.first_name} onChange={v => updateClient('first_name', v)} placeholder="John" required />
              </Field>
              <Field label="Last Name *">
                <Input value={client.last_name} onChange={v => updateClient('last_name', v)} placeholder="Smith" required />
              </Field>
            </div>
            <div style={grid2}>
              <Field label="Date of Birth">
                <Input type="date" value={client.date_of_birth} onChange={v => updateClient('date_of_birth', v)} />
              </Field>
              <Field label="Phone">
                <Input value={client.phone} onChange={v => updateClient('phone', v)} placeholder="(555) 000-0000" type="tel" />
              </Field>
            </div>
            <Field label="Email">
              <Input value={client.email} onChange={v => updateClient('email', v)} placeholder="john@email.com" type="email" />
            </Field>
          </Card>

          <Card title="Location" style={{ marginTop: '16px' }}>
            <div style={grid3}>
              <Field label="City">
                <Input value={client.city} onChange={v => updateClient('city', v)} placeholder="Baton Rouge" />
              </Field>
              <Field label="State">
                <Select
                  value={client.state}
                  onChange={v => updateClient('state', v)}
                  placeholder="Select state"
                  options={US_STATES.map(s => ({ value: s, label: s }))}
                />
              </Field>
              <Field label="ZIP Code">
                <Input value={client.zip} onChange={v => updateClient('zip', v)} placeholder="70801" maxLength={5} />
              </Field>
            </div>
          </Card>

          <Card title="Health Information" style={{ marginTop: '16px' }}>
            <div style={grid2}>
              <Field label="Health Status">
                <Select
                  value={client.health_status}
                  onChange={v => updateClient('health_status', v)}
                  placeholder="Select health status"
                  options={HEALTH_STATUSES.map(h => ({ value: h.value, label: h.label }))}
                />
              </Field>
              <Field label="Tobacco User">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px' }}>
                  <ToggleSwitch value={client.tobacco_user} onChange={v => updateClient('tobacco_user', v)} />
                  <span style={{ fontSize: '13px', color: '#4A4A4A' }}>
                    {client.tobacco_user ? 'Yes — tobacco user' : 'No — non-tobacco'}
                  </span>
                </div>
              </Field>
            </div>
            <Field label="Health Notes">
              <Textarea value={client.health_notes} onChange={v => updateClient('health_notes', v)} placeholder="Pre-existing conditions, medications, relevant health history..." />
            </Field>
          </Card>

          <Card title="General Notes" style={{ marginTop: '16px' }}>
            <Field label="Notes">
              <Textarea value={client.notes} onChange={v => updateClient('notes', v)} placeholder="Any additional notes about this client..." />
            </Field>
          </Card>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => router.push('/crm')} style={secondaryBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving...' : 'Save Client & Continue →'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2 — POLICY DETAILS */}
      {step === 'policy' && (
        <form onSubmit={handlePolicySubmit}>
          <div style={{
            padding: '16px', backgroundColor: '#F0FAF4',
            border: '1px solid #C8E6C9', borderRadius: '8px',
            marginBottom: '20px', fontSize: '13px', color: '#2E7D32',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            ✓ Client saved successfully. Now add their policy details.
          </div>

          <Card title="Policy Information">
            <div style={grid2}>
              <Field label="Carrier *">
                <Select
                  value={policy.carrier}
                  onChange={v => updatePolicy('carrier', v)}
                  placeholder="Select carrier"
                  options={CARRIERS.map(c => ({ value: c, label: c }))}
                  required
                />
              </Field>
              <Field label="Product Type *">
                <Select
                  value={policy.product_type}
                  onChange={v => updatePolicy('product_type', v)}
                  placeholder="Select product"
                  options={PRODUCT_TYPES.map(p => ({ value: p, label: p }))}
                  required
                />
              </Field>
            </div>
            <div style={grid2}>
              <Field label="Policy Number">
                <Input value={policy.policy_number} onChange={v => updatePolicy('policy_number', v)} placeholder="e.g. MO-12345678" />
              </Field>
              <Field label="Policy Status">
                <Select
                  value={policy.status}
                  onChange={v => updatePolicy('status', v)}
                  options={POLICY_STATUSES.map(s => ({ value: s.value, label: s.label }))}
                />
              </Field>
            </div>
          </Card>

          <Card title="Coverage & Premium" style={{ marginTop: '16px' }}>
            <div style={grid3}>
              <Field label="Face Amount">
                <InputWithPrefix prefix="$" value={policy.face_amount} onChange={v => updatePolicy('face_amount', v)} placeholder="250,000" type="number" />
              </Field>
              <Field label="Monthly Premium">
                <InputWithPrefix prefix="$" value={policy.monthly_premium} onChange={v => updatePolicy('monthly_premium', v)} placeholder="0.00" type="number" />
              </Field>
              <Field label="Annual Premium">
                <InputWithPrefix prefix="$" value={policy.annual_premium} onChange={v => updatePolicy('annual_premium', v)} placeholder="0.00" type="number" />
              </Field>
            </div>
          </Card>

          <Card title="Dates" style={{ marginTop: '16px' }}>
            <div style={grid2}>
              <Field label="Date Written *">
                <Input type="date" value={policy.date_written} onChange={v => updatePolicy('date_written', v)} required />
              </Field>
              <Field label="Effective Date">
                <Input type="date" value={policy.effective_date} onChange={v => updatePolicy('effective_date', v)} />
              </Field>
            </div>
          </Card>

          <Card title="Notes" style={{ marginTop: '16px' }}>
            <Field label="Policy Notes">
              <Textarea value={policy.notes} onChange={v => updatePolicy('notes', v)} placeholder="Any notes about this policy, application, underwriting..." />
            </Field>
          </Card>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => { setSkipPolicy(true); setStep('done') }} style={secondaryBtn}>
              Skip — Add Policy Later
            </button>
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving...' : 'Save Policy →'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3 — DONE */}
      {step === 'done' && (
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '16px',
          border: '1px solid #E5E1DA', padding: '48px', textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: '#F0FAF4', border: '2px solid #C8E6C9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', margin: '0 auto 20px',
          }}>
            ✓
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>
            Client {skipPolicy ? 'Added' : '& Policy Saved'}!
          </h2>
          <p style={{ fontSize: '14px', color: '#7A7A7A', marginBottom: '28px' }}>
            {skipPolicy
              ? 'Client saved. You can add a policy anytime from their profile.'
              : 'The client and policy have been logged to your book of business.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push(`/crm/clients/${createdClientId}`)} style={primaryBtn}>
              View Client Profile
            </button>
            <button
              onClick={() => {
                setStep('client')
                setClient({ first_name: '', last_name: '', date_of_birth: '', email: '', phone: '', city: '', state: '', zip: '', health_status: '', tobacco_user: false, health_notes: '', notes: '' })
                setPolicy({ carrier: '', product_type: '', policy_number: '', face_amount: '', monthly_premium: '', annual_premium: '', date_written: new Date().toISOString().split('T')[0], effective_date: '', status: 'pending', notes: '' })
                setCreatedClientId(null)
                setSkipPolicy(false)
                setError('')
              }}
              style={secondaryBtn}
            >
              + Add Another Client
            </button>
            <button onClick={() => router.push('/crm')} style={secondaryBtn}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function Card({ title, children, style = {} }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden', ...style }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0EDE8', fontSize: '12px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#FAFAF8' }}>
        {title}
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: '600', color: '#4A4A4A', letterSpacing: '0.02em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder = '', type = 'text', required = false, maxLength, disabled = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; maxLength?: number; disabled?: boolean
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} maxLength={maxLength} disabled={disabled} style={inputStyle} />
  )
}

function InputWithPrefix({ prefix, value, onChange, placeholder = '', type = 'text' }: {
  prefix: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
      <span style={{ position: 'absolute', left: '12px', fontSize: '14px', color: '#7A7A7A', pointerEvents: 'none' }}>{prefix}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min="0" step="0.01" style={{ ...inputStyle, paddingLeft: '28px', width: '100%' }} />
    </div>
  )
}

function Select({ value, onChange, options, placeholder, required = false }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; required?: boolean
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} required={required} style={{ ...inputStyle, cursor: 'pointer' }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Textarea({ value, onChange, placeholder = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
  )
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} style={{
      width: '44px', height: '24px', borderRadius: '12px',
      backgroundColor: value ? '#C9A96E' : '#E5E1DA',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background-color 0.2s ease', flexShrink: 0, padding: 0,
    }}>
      <span style={{
        position: 'absolute', top: '3px', left: value ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        backgroundColor: '#FFFFFF', transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: '14px', color: '#1A1A1A',
  backgroundColor: '#FAFAF8', border: '1px solid #E5E1DA', borderRadius: '8px',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.4',
}
const primaryBtn: React.CSSProperties = {
  padding: '11px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A',
  border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
}
const secondaryBtn: React.CSSProperties = {
  padding: '11px 20px', backgroundColor: '#FFFFFF', color: '#4A4A4A',
  border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
}
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }
