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
          {/* Info Banner */}
          <div style={{ padding: '14px 18px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#1E40AF', marginBottom: '3px' }}>Quick Tip — Two Ways to Use This Form</p>
              <p style={{ fontSize: '13px', color: '#1E40AF', lineHeight: 1.6 }}>
                <strong>For a quote:</strong> Just fill out the basic information at the top — name, date of birth, phone, email, location, and health status. That&apos;s all you need to move to Policy Details.<br />
                <strong>For a full application:</strong> Complete the entire worksheet below including employment, beneficiaries, medications, and bank information before submitting.
              </p>
            </div>
          </div>

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
              <Textarea
                value={client.notes}
                onChange={v => updateClient('notes', v)}
                placeholder="Any additional notes about this client..."
              />
            </Field>
          </Card>

          {/* Pre-Fill Worksheet Divider */}
          <div style={{ marginTop: '28px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E1DA' }} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Full Application Worksheet (Optional)</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E1DA' }} />
          </div>

          {/* Section 1 Extended - Additional Personal Info */}
          <Card title="Additional Personal Information" style={{ marginTop: '16px' }}>
            <div style={grid3}>
              <Field label="Middle Name">
                <Input value={client.middle_name ?? ''} onChange={v => updateClient('middle_name', v)} placeholder="Middle name" />
              </Field>
              <Field label="Gender">
                <Select value={client.gender ?? ''} onChange={v => updateClient('gender', v)} placeholder="Select" options={[{value:'M',label:'Male'},{value:'F',label:'Female'}]} />
              </Field>
              <Field label="Best Time to Call">
                <Input value={client.best_time_to_call ?? ''} onChange={v => updateClient('best_time_to_call', v)} placeholder="e.g. Mornings" />
              </Field>
            </div>
            <Field label="Street Address">
              <Input value={client.address_line1 ?? ''} onChange={v => updateClient('address_line1', v)} placeholder="123 Main St" />
            </Field>
            <div style={grid2}>
              <Field label="SSN">
                <Input value={client.ssn ?? ''} onChange={v => updateClient('ssn', v)} placeholder="XXX-XX-XXXX" />
              </Field>
              <Field label="Driver's License #">
                <Input value={client.drivers_license_number ?? ''} onChange={v => updateClient('drivers_license_number', v)} />
              </Field>
            </div>
            <div style={grid3}>
              <Field label="DL Expiration">
                <Input type="date" value={client.drivers_license_expiration ?? ''} onChange={v => updateClient('drivers_license_expiration', v)} />
              </Field>
              <Field label="DL State">
                <Input value={client.drivers_license_state ?? ''} onChange={v => updateClient('drivers_license_state', v)} maxLength={2} />
              </Field>
              <Field label="U.S. Citizen?">
                <Select value={client.us_citizen === true ? 'yes' : client.us_citizen === false ? 'no' : ''} onChange={v => updateClient('us_citizen', v === 'yes')} placeholder="Select" options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
              </Field>
            </div>
            <Field label="Country of Birth">
              <Input value={client.country_of_birth ?? ''} onChange={v => updateClient('country_of_birth', v)} placeholder="U.S." />
            </Field>
          </Card>

          {/* Section 2 - Employment & Financial */}
          <Card title="Employment & Financial Information" style={{ marginTop: '16px' }}>
            <div style={grid2}>
              <Field label="Employer Name">
                <Input value={client.employer_name ?? ''} onChange={v => updateClient('employer_name', v)} />
              </Field>
              <Field label="Employer Street Address">
                <Input value={client.employer_address ?? ''} onChange={v => updateClient('employer_address', v)} />
              </Field>
            </div>
            <div style={grid3}>
              <Field label="Employer City">
                <Input value={client.employer_city ?? ''} onChange={v => updateClient('employer_city', v)} />
              </Field>
              <Field label="Employer State">
                <Input value={client.employer_state ?? ''} onChange={v => updateClient('employer_state', v)} maxLength={2} />
              </Field>
              <Field label="Employer ZIP">
                <Input value={client.employer_zip ?? ''} onChange={v => updateClient('employer_zip', v)} maxLength={5} />
              </Field>
            </div>
            <div style={grid2}>
              <Field label="Annual Income">
                <InputWithPrefix prefix="$" value={client.annual_income ?? ''} onChange={v => updateClient('annual_income', v)} placeholder="0" type="number" />
              </Field>
              <Field label="Estimated Net Worth">
                <InputWithPrefix prefix="$" value={client.estimated_net_worth ?? ''} onChange={v => updateClient('estimated_net_worth', v)} placeholder="0" type="number" />
              </Field>
            </div>
            <div style={grid2}>
              <Field label="# of Dependents">
                <Input type="number" value={client.num_dependents ?? ''} onChange={v => updateClient('num_dependents', v)} />
              </Field>
              <Field label="Dependent Ages (comma separated)">
                <Input value={client.dependent_ages ?? ''} onChange={v => updateClient('dependent_ages', v)} placeholder="5, 8, 12" />
              </Field>
            </div>
          </Card>

          {/* Section 3 - Health & Lifestyle Questions */}
          <Card title="Health & Lifestyle Questions" style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#7A7A7A', fontStyle: 'italic', marginBottom: '8px' }}>Answer all questions honestly. A &apos;Yes&apos; answer does not automatically disqualify coverage.</p>
            {[
              { key: 'health_q1', label: '1. Within the last 90 days, have you been recommended by a physician or medical practitioner to undergo diagnostic procedures or tests for any symptoms, illnesses, or conditions?' },
              { key: 'health_q2', label: '2. Within the last 2 years, have you been unable to work, attend school, or perform normal activities for 30 days or more?' },
              { key: 'health_q3', label: '3. Within the last 2 years, have you been admitted to a hospital or other medical facility for more than 2 consecutive days?' },
              { key: 'health_q4', label: "4. In the last 5 years, has your driver's license been suspended or revoked? Or have you been declined for issue, reinstatement, or renewal of any type of life or health insurance?" },
              { key: 'health_q5', label: '5. In the last 10 years, have you pled guilty to, or been convicted of, any felony or misdemeanor, or are any such charges currently pending?' },
              { key: 'health_q6', label: '6. In the next 12 months, do you plan to travel or reside outside of the U.S. or Canada?' },
              { key: 'health_q7', label: '7. In the last or next 12 months, have you been engaged in, or intend to engage in, any hazardous activity (skydiving, racing, rock climbing, etc.)?' },
              { key: 'health_q8', label: '8. Are you a homeowner?' },
              { key: 'health_q9', label: '9. Have you used tobacco, nicotine, or any nicotine substitution product in the last 12 months?' },
            ].map(q => (
              <div key={q.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #F9F7F4' }}>
                <p style={{ fontSize: '13px', color: '#1A1A1A', lineHeight: 1.5, flex: 1, paddingRight: '20px' }}>{q.label}</p>
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#4A4A4A' }}>
                      <input type="radio" name={q.key} checked={(client as any)[q.key] === (opt === 'Yes')} onChange={() => updateClient(q.key, opt === 'Yes')} style={{ cursor: 'pointer' }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {(client as any).health_q9 === true && (
              <div style={{ ...grid2, marginTop: '12px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '8px' }}>
                <Field label="Tobacco Product Type">
                  <Input value={(client as any).tobacco_product_type ?? ''} onChange={v => updateClient('tobacco_product_type', v)} placeholder="e.g. Cigarettes, Vape" />
                </Field>
                <Field label="Date of Last Use">
                  <Input value={(client as any).tobacco_last_use ?? ''} onChange={v => updateClient('tobacco_last_use', v)} placeholder="MM/YYYY" />
                </Field>
              </div>
            )}
          </Card>

          {/* Section 4 - Beneficiaries */}
          <Card title="Beneficiary Information" style={{ marginTop: '16px' }}>
            {[
              { label: 'Primary Beneficiary 1', prefix: 'beneficiary_primary1' },
              { label: 'Primary Beneficiary 2', prefix: 'beneficiary_primary2' },
              { label: 'Contingent Beneficiary', prefix: 'beneficiary_contingent' },
            ].map(b => (
              <div key={b.prefix} style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{b.label}</p>
                <div style={grid2}>
                  <Field label="Full Legal Name">
                    <Input value={(client as any)[`${b.prefix}_name`] ?? ''} onChange={v => updateClient(`${b.prefix}_name`, v)} />
                  </Field>
                  <Field label="Relationship">
                    <Input value={(client as any)[`${b.prefix}_relationship`] ?? ''} onChange={v => updateClient(`${b.prefix}_relationship`, v)} />
                  </Field>
                </div>
                <div style={{ ...grid2, marginTop: '8px' }}>
                  <Field label="Phone Number">
                    <Input value={(client as any)[`${b.prefix}_phone`] ?? ''} onChange={v => updateClient(`${b.prefix}_phone`, v)} />
                  </Field>
                  <Field label="% Share">
                    <Input type="number" value={(client as any)[`${b.prefix}_share`] ?? ''} onChange={v => updateClient(`${b.prefix}_share`, v)} placeholder="0" />
                  </Field>
                </div>
              </div>
            ))}
          </Card>

          {/* Section 5 - Medications */}
          <Card title="Current Medications" style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#7A7A7A', fontStyle: 'italic', marginBottom: '12px' }}>List all current prescription medications, OTC drugs, and supplements.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <input type="checkbox" checked={(client as any).no_current_medications ?? false} onChange={e => updateClient('no_current_medications', e.target.checked)} style={{ cursor: 'pointer' }} />
              <label style={{ fontSize: '13px', color: '#4A4A4A' }}>Client reports NO current medications</label>
            </div>
            {!(client as any).no_current_medications && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 2fr 1fr', gap: '8px', marginBottom: '6px' }}>
                  {['Medication Name', 'Dosage & Frequency', 'Condition / Reason', 'Prescribing Doctor', 'How Long'].map(h => (
                    <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                  ))}
                </div>
                {[0,1,2,3,4].map(i => {
                  const meds = (client as any).medications ?? []
                  const med = meds[i] ?? {}
                  const updateMed = (field: string, value: string) => {
                    const updated = [...((client as any).medications ?? [])]
                    updated[i] = { ...(updated[i] ?? {}), [field]: value }
                    updateClient('medications', updated)
                  }
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <input style={inputStyle} value={med.name ?? ''} onChange={e => updateMed('name', e.target.value)} placeholder={`Med ${i+1}`} />
                      <input style={inputStyle} value={med.dosage ?? ''} onChange={e => updateMed('dosage', e.target.value)} placeholder="e.g. 10mg daily" />
                      <input style={inputStyle} value={med.condition ?? ''} onChange={e => updateMed('condition', e.target.value)} placeholder="e.g. Blood pressure" />
                      <input style={inputStyle} value={med.doctor ?? ''} onChange={e => updateMed('doctor', e.target.value)} placeholder="Dr. Smith" />
                      <input style={inputStyle} value={med.duration ?? ''} onChange={e => updateMed('duration', e.target.value)} placeholder="2 yrs" />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Section 6 - Existing Insurance */}
          <Card title="Existing Life Insurance Coverage" style={{ marginTop: '16px' }}>
            {[0,1].map(i => {
              const ins = ((client as any).existing_insurance ?? [])[i] ?? {}
              const updateIns = (field: string, value: string) => {
                const updated = [...((client as any).existing_insurance ?? [])]
                updated[i] = { ...(updated[i] ?? {}), [field]: value }
                updateClient('existing_insurance', updated)
              }
              return (
                <div key={i} style={grid3}>
                  <Field label={`Insurance Company ${i+1}`}>
                    <Input value={ins.company ?? ''} onChange={v => updateIns('company', v)} />
                  </Field>
                  <Field label="Policy Type">
                    <Input value={ins.type ?? ''} onChange={v => updateIns('type', v)} />
                  </Field>
                  <Field label="Coverage Amount">
                    <InputWithPrefix prefix="$" value={ins.amount ?? ''} onChange={v => updateIns('amount', v)} type="number" />
                  </Field>
                </div>
              )
            })}
          </Card>

          {/* Section 7 - Bank Info */}
          <Card title="Bank / Payment Information" style={{ marginTop: '16px' }}>
            <div style={grid3}>
              <Field label="Bank Name">
                <Input value={(client as any).bank_name ?? ''} onChange={v => updateClient('bank_name', v)} />
              </Field>
              <Field label="City">
                <Input value={(client as any).bank_city ?? ''} onChange={v => updateClient('bank_city', v)} />
              </Field>
              <Field label="State">
                <Input value={(client as any).bank_state ?? ''} onChange={v => updateClient('bank_state', v)} maxLength={2} />
              </Field>
            </div>
            <div style={grid2}>
              <Field label="Routing Number">
                <Input value={(client as any).bank_routing_number ?? ''} onChange={v => updateClient('bank_routing_number', v)} />
              </Field>
              <Field label="Account Number">
                <Input value={(client as any).bank_account_number ?? ''} onChange={v => updateClient('bank_account_number', v)} />
              </Field>
            </div>
          </Card>

          {/* Section 8 - Agent Notes */}
          <Card title="Agent Notes / Additional Information" style={{ marginTop: '16px' }}>
            <Field label="Notes">
              <Textarea value={(client as any).agent_notes ?? ''} onChange={v => updateClient('agent_notes', v)} placeholder="Any additional notes about this client for the application..." />
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
