'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCRMClient, createCRMPolicy } from '@/app/_actions/crm-actions'
import { CARRIERS, PRODUCT_TYPES, POLICY_STATUSES, HEALTH_STATUSES, US_STATES } from '@/app/crm-constants'
import { supabase } from '@/app/lib/supabase'

type Step = 'client' | 'policy' | 'done'

export default function NewClientPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('client')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)
  const [skipPolicy, setSkipPolicy] = useState(false)
  const [showTip, setShowTip] = useState(true)

  const [client, setClient] = useState<any>({
    // Basic (required for quote)
    first_name: '', last_name: '', date_of_birth: '',
    email: '', phone: '', city: '', state: '', zip: '',
    health_status: '', tobacco_user: false, health_notes: '', notes: '',
    // Extended personal
    middle_name: '', gender: '', address_line1: '', best_time_to_call: '',
    ssn: '', drivers_license_number: '', drivers_license_expiration: '',
    drivers_license_state: '', us_citizen: null, country_of_birth: 'U.S.',
    // Employment
    employer_name: '', employer_address: '', employer_city: '',
    employer_state: '', employer_zip: '', annual_income: '',
    estimated_net_worth: '', num_dependents: '', dependent_ages: '',
    // Health questions
    health_q1: null, health_q2: null, health_q3: null, health_q4: null,
    health_q5: null, health_q6: null, health_q7: null, health_q8: null,
    health_q9: null, tobacco_product_type: '', tobacco_last_use: '',
    // Beneficiaries
    beneficiary_primary1_name: '', beneficiary_primary1_relationship: '',
    beneficiary_primary1_phone: '', beneficiary_primary1_share: '',
    beneficiary_primary2_name: '', beneficiary_primary2_relationship: '',
    beneficiary_primary2_phone: '', beneficiary_primary2_share: '',
    beneficiary_contingent_name: '', beneficiary_contingent_relationship: '',
    beneficiary_contingent_phone: '', beneficiary_contingent_share: '',
    // Medications
    medications: [{},{},{},{},{}], no_current_medications: false,
    // Existing insurance
    existing_insurance: [{},{}],
    // Bank
    bank_name: '', bank_city: '', bank_state: '',
    bank_routing_number: '', bank_account_number: '',
    // Agent notes
    agent_notes: '',
  })

  const [policy, setPolicy] = useState({
    carrier: '', product_type: '', policy_number: '',
    face_amount: '', monthly_premium: '', annual_premium: '',
    date_written: new Date().toISOString().split('T')[0],
    effective_date: '', status: 'pending', notes: '',
  })

  const upd = (field: string, value: any) =>
    setClient((prev: any) => ({ ...prev, [field]: value }))

  const updPolicy = (field: string, value: string) =>
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
        first_name: client.first_name,
        last_name: client.last_name,
        date_of_birth: client.date_of_birth || undefined,
        email: client.email || undefined,
        phone: client.phone || undefined,
        city: client.city || undefined,
        state: client.state || undefined,
        zip: client.zip || undefined,
        health_status: client.health_status || undefined,
        tobacco_user: client.tobacco_user,
        health_notes: client.health_notes || undefined,
        notes: client.notes || undefined,
      })
      if (result.error) { setError(result.error); return }

      const clientId = result.data?.id
      if (clientId) {
        // Save all the extended pre-fill data
        await supabase.from('crm_clients').update({
          middle_name: client.middle_name || null,
          gender: client.gender || null,
          address_line1: client.address_line1 || null,
          best_time_to_call: client.best_time_to_call || null,
          ssn: client.ssn || null,
          drivers_license_number: client.drivers_license_number || null,
          drivers_license_expiration: client.drivers_license_expiration || null,
          drivers_license_state: client.drivers_license_state || null,
          us_citizen: client.us_citizen,
          country_of_birth: client.country_of_birth || null,
          employer_name: client.employer_name || null,
          employer_address: client.employer_address || null,
          employer_city: client.employer_city || null,
          employer_state: client.employer_state || null,
          employer_zip: client.employer_zip || null,
          annual_income: client.annual_income ? Number(client.annual_income) : null,
          estimated_net_worth: client.estimated_net_worth ? Number(client.estimated_net_worth) : null,
          num_dependents: client.num_dependents ? Number(client.num_dependents) : null,
          dependent_ages: client.dependent_ages || null,
          health_q1: client.health_q1,
          health_q2: client.health_q2,
          health_q3: client.health_q3,
          health_q4: client.health_q4,
          health_q5: client.health_q5,
          health_q6: client.health_q6,
          health_q7: client.health_q7,
          health_q8: client.health_q8,
          health_q9: client.health_q9,
          tobacco_product_type: client.tobacco_product_type || null,
          tobacco_last_use: client.tobacco_last_use || null,
          beneficiary_primary1_name: client.beneficiary_primary1_name || null,
          beneficiary_primary1_relationship: client.beneficiary_primary1_relationship || null,
          beneficiary_primary1_phone: client.beneficiary_primary1_phone || null,
          beneficiary_primary1_share: client.beneficiary_primary1_share ? Number(client.beneficiary_primary1_share) : null,
          beneficiary_primary2_name: client.beneficiary_primary2_name || null,
          beneficiary_primary2_relationship: client.beneficiary_primary2_relationship || null,
          beneficiary_primary2_phone: client.beneficiary_primary2_phone || null,
          beneficiary_primary2_share: client.beneficiary_primary2_share ? Number(client.beneficiary_primary2_share) : null,
          beneficiary_contingent_name: client.beneficiary_contingent_name || null,
          beneficiary_contingent_relationship: client.beneficiary_contingent_relationship || null,
          beneficiary_contingent_phone: client.beneficiary_contingent_phone || null,
          beneficiary_contingent_share: client.beneficiary_contingent_share ? Number(client.beneficiary_contingent_share) : null,
          medications: client.medications.filter((m: any) => m.name),
          no_current_medications: client.no_current_medications,
          existing_insurance: client.existing_insurance.filter((i: any) => i.company),
          bank_name: client.bank_name || null,
          bank_city: client.bank_city || null,
          bank_state: client.bank_state || null,
          bank_routing_number: client.bank_routing_number || null,
          bank_account_number: client.bank_account_number || null,
          agent_notes: client.agent_notes || null,
        }).eq('id', clientId)
      }

      setCreatedClientId(clientId ?? null)
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
    { key: 'done', label: '3. Complete' },
  ]

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: '13px', color: '#1A1A1A', backgroundColor: '#FAFAF8', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#4A4A4A', letterSpacing: '0.02em', display: 'block', marginBottom: '4px' }
  const sectionHeader = (num: number, title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', marginTop: '24px' }}>
      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#C9A96E', flexShrink: 0 }}>{num}</div>
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{title}</h3>
      <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E1DA' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>Add New Client</h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>Log a new client and their policy details</p>
      </div>

      {/* Step Progress */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        {steps.map((s, i) => {
          const isActive = s.key === step
          const isDone = (step === 'policy' && s.key === 'client') || (step === 'done' && s.key !== 'done')
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'initial' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0, backgroundColor: isDone ? '#C9A96E' : isActive ? '#1A1A1A' : '#E5E1DA', color: isDone || isActive ? '#FFF' : '#AAA' }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '12px', fontWeight: isActive ? '700' : '400', color: isActive ? '#1A1A1A' : isDone ? '#C9A96E' : '#AAA', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: '1px', backgroundColor: isDone ? '#C9A96E' : '#E5E1DA', margin: '0 12px' }} />}
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#C0392B', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
      )}

      {/* STEP 1 — CLIENT INFO */}
      {step === 'client' && (
        <form onSubmit={handleClientSubmit}>

          {/* Tip Banner */}
          {showTip && (
            <div style={{ padding: '14px 18px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1E40AF', marginBottom: '4px' }}>Quick Tip — Two Ways to Use This Form</p>
                <p style={{ fontSize: '13px', color: '#1E40AF', lineHeight: 1.6 }}>
                  <strong>For a quote:</strong> Only fill out Section 1 (Personal Information), Location, and Health Information. That&apos;s all you need to move to Policy Details.<br />
                  <strong>For a full application:</strong> Complete all sections below including employment, beneficiaries, medications, and bank information.
                </p>
              </div>
              <button type="button" onClick={() => setShowTip(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93C5FD', fontSize: '18px', padding: 0, flexShrink: 0 }}>×</button>
            </div>
          )}

          <div style={{ padding: '14px 18px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', marginBottom: '20px', marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', color: '#1E40AF', lineHeight: 1.6 }}>
                Already closed this client? You only need their basic personal information and policy details to get them logged in the CRM. Fill in what you have and you can always add more later.
              </p>
            </div>
          </div>

          {/* Section 1 - Personal Information */}
          {sectionHeader(1, 'Personal Information')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>First Name *</label><input style={inp} value={client.first_name} onChange={e => upd('first_name', e.target.value)} placeholder="John" required /></div>
            <div><label style={lbl}>Middle Name</label><input style={inp} value={client.middle_name} onChange={e => upd('middle_name', e.target.value)} placeholder="Michael" /></div>
            <div><label style={lbl}>Last Name *</label><input style={inp} value={client.last_name} onChange={e => upd('last_name', e.target.value)} placeholder="Smith" required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>Date of Birth</label><input type="date" style={inp} value={client.date_of_birth} onChange={e => upd('date_of_birth', e.target.value)} /></div>
            <div>
              <label style={lbl}>Gender</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={client.gender} onChange={e => upd('gender', e.target.value)}>
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div><label style={lbl}>Best Time to Call</label><input style={inp} value={client.best_time_to_call} onChange={e => upd('best_time_to_call', e.target.value)} placeholder="e.g. Mornings" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>Phone</label><input style={inp} value={client.phone} onChange={e => upd('phone', e.target.value)} placeholder="(555) 000-0000" /></div>
            <div><label style={lbl}>Email</label><input type="email" style={inp} value={client.email} onChange={e => upd('email', e.target.value)} placeholder="john@email.com" /></div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Street Address</label>
            <input style={inp} value={client.address_line1} onChange={e => upd('address_line1', e.target.value)} placeholder="123 Main St" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>SSN</label><input style={inp} value={client.ssn} onChange={e => upd('ssn', e.target.value)} placeholder="XXX-XX-XXXX" /></div>
            <div><label style={lbl}>Driver&apos;s License #</label><input style={inp} value={client.drivers_license_number} onChange={e => upd('drivers_license_number', e.target.value)} /></div>
            <div><label style={lbl}>DL Expiration</label><input type="date" style={inp} value={client.drivers_license_expiration} onChange={e => upd('drivers_license_expiration', e.target.value)} /></div>
            <div><label style={lbl}>DL State</label><input style={inp} value={client.drivers_license_state} onChange={e => upd('drivers_license_state', e.target.value)} maxLength={2} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={lbl}>U.S. Citizen / Resident Alien Taxpayer?</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={client.us_citizen === true ? 'yes' : client.us_citizen === false ? 'no' : ''} onChange={e => upd('us_citizen', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}>
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div><label style={lbl}>Country of Birth</label><input style={inp} value={client.country_of_birth} onChange={e => upd('country_of_birth', e.target.value)} placeholder="U.S." /></div>
          </div>

          {/* Location */}
          {sectionHeader(2, 'Location')}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>City</label><input style={inp} value={client.city} onChange={e => upd('city', e.target.value)} placeholder="Baton Rouge" /></div>
            <div>
              <label style={lbl}>State</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={client.state} onChange={e => upd('state', e.target.value)}>
                <option value="">Select state</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>ZIP Code</label><input style={inp} value={client.zip} onChange={e => upd('zip', e.target.value)} placeholder="70801" maxLength={5} /></div>
          </div>

          {/* Health Information */}
          {sectionHeader(3, 'Health Information')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={lbl}>Health Status</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={client.health_status} onChange={e => upd('health_status', e.target.value)}>
                <option value="">Select health status</option>
                {HEALTH_STATUSES.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Tobacco User</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px' }}>
                <button type="button" onClick={() => upd('tobacco_user', !client.tobacco_user)} style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: client.tobacco_user ? '#C9A96E' : '#E5E1DA', border: 'none', cursor: 'pointer', position: 'relative', padding: 0 }}>
                  <span style={{ position: 'absolute', top: '3px', left: client.tobacco_user ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
                <span style={{ fontSize: '13px', color: '#4A4A4A' }}>{client.tobacco_user ? 'Yes — tobacco user' : 'No — non-tobacco'}</span>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Health Notes</label>
            <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }} value={client.health_notes} onChange={e => upd('health_notes', e.target.value)} placeholder="Pre-existing conditions, medications, relevant health history..." />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>General Notes</label>
            <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }} value={client.notes} onChange={e => upd('notes', e.target.value)} placeholder="Any additional notes about this client..." />
          </div>

          {/* Divider */}
          <div style={{ margin: '28px 0 8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E1DA' }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Full Application Worksheet — Optional</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E1DA' }} />
          </div>

          {/* Section 4 - Employment & Financial */}
          {sectionHeader(4, 'Employment & Financial Information')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>Employer Name</label><input style={inp} value={client.employer_name} onChange={e => upd('employer_name', e.target.value)} /></div>
            <div><label style={lbl}>Employer Street Address</label><input style={inp} value={client.employer_address} onChange={e => upd('employer_address', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>City</label><input style={inp} value={client.employer_city} onChange={e => upd('employer_city', e.target.value)} /></div>
            <div><label style={lbl}>State</label><input style={inp} value={client.employer_state} onChange={e => upd('employer_state', e.target.value)} maxLength={2} /></div>
            <div><label style={lbl}>ZIP</label><input style={inp} value={client.employer_zip} onChange={e => upd('employer_zip', e.target.value)} maxLength={5} /></div>
            <div><label style={lbl}>Annual Income</label><input type="number" style={inp} value={client.annual_income} onChange={e => upd('annual_income', e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>Est. Net Worth</label><input type="number" style={inp} value={client.estimated_net_worth} onChange={e => upd('estimated_net_worth', e.target.value)} placeholder="0" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}># of Dependents</label><input type="number" style={inp} value={client.num_dependents} onChange={e => upd('num_dependents', e.target.value)} /></div>
            <div><label style={lbl}>Dependent Ages (comma separated)</label><input style={inp} value={client.dependent_ages} onChange={e => upd('dependent_ages', e.target.value)} placeholder="5, 8, 12" /></div>
          </div>

          {/* Section 5 - Health & Lifestyle Questions */}
          {sectionHeader(5, 'Health & Lifestyle Questions')}
          <p style={{ fontSize: '12px', color: '#7A7A7A', fontStyle: 'italic', marginBottom: '12px' }}>Answer all questions honestly. A &apos;Yes&apos; answer does not automatically disqualify coverage.</p>
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
            <div key={q.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #F0EDE8' }}>
              <p style={{ fontSize: '13px', color: '#1A1A1A', lineHeight: 1.5, flex: 1, paddingRight: '20px', margin: 0 }}>{q.label}</p>
              <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
                {['Yes', 'No'].map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#4A4A4A' }}>
                    <input type="radio" name={q.key} checked={client[q.key] === (opt === 'Yes')} onChange={() => upd(q.key, opt === 'Yes')} style={{ cursor: 'pointer' }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {client.health_q9 === true && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '8px' }}>
              <div><label style={lbl}>Tobacco Product Type</label><input style={inp} value={client.tobacco_product_type} onChange={e => upd('tobacco_product_type', e.target.value)} placeholder="e.g. Cigarettes, Vape" /></div>
              <div><label style={lbl}>Date of Last Use</label><input style={inp} value={client.tobacco_last_use} onChange={e => upd('tobacco_last_use', e.target.value)} placeholder="MM/YYYY" /></div>
            </div>
          )}

          {/* Section 6 - Beneficiaries */}
          {sectionHeader(6, 'Beneficiary Information')}
          {[
            { label: 'Primary Beneficiary 1', prefix: 'beneficiary_primary1' },
            { label: 'Primary Beneficiary 2', prefix: 'beneficiary_primary2' },
            { label: 'Contingent Beneficiary', prefix: 'beneficiary_contingent' },
          ].map(b => (
            <div key={b.prefix} style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{b.label}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                <div><label style={lbl}>Full Legal Name</label><input style={inp} value={client[`${b.prefix}_name`]} onChange={e => upd(`${b.prefix}_name`, e.target.value)} /></div>
                <div><label style={lbl}>Relationship</label><input style={inp} value={client[`${b.prefix}_relationship`]} onChange={e => upd(`${b.prefix}_relationship`, e.target.value)} /></div>
                <div><label style={lbl}>Phone</label><input style={inp} value={client[`${b.prefix}_phone`]} onChange={e => upd(`${b.prefix}_phone`, e.target.value)} /></div>
                <div><label style={lbl}>% Share</label><input type="number" style={inp} value={client[`${b.prefix}_share`]} onChange={e => upd(`${b.prefix}_share`, e.target.value)} placeholder="0" min="0" max="100" /></div>
              </div>
            </div>
          ))}

          {/* Section 7 - Medications */}
          {sectionHeader(7, 'Current Medications')}
          <p style={{ fontSize: '12px', color: '#7A7A7A', fontStyle: 'italic', marginBottom: '10px' }}>List all current prescription medications, OTC drugs, and supplements. Include dosage and reason for use.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input type="checkbox" checked={client.no_current_medications} onChange={e => upd('no_current_medications', e.target.checked)} style={{ cursor: 'pointer' }} />
            <label style={{ fontSize: '13px', color: '#4A4A4A', cursor: 'pointer' }}>Client reports NO current medications</label>
          </div>
          {!client.no_current_medications && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 2fr 1fr', gap: '8px', marginBottom: '6px' }}>
                {['Medication Name', 'Dosage & Frequency', 'Condition / Reason', 'Prescribing Doctor', 'How Long'].map(h => (
                  <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                ))}
              </div>
              {[0,1,2,3,4].map(i => {
                const med = client.medications[i] ?? {}
                const updateMed = (field: string, value: string) => {
                  const updated = [...client.medications]
                  updated[i] = { ...updated[i], [field]: value }
                  upd('medications', updated)
                }
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input style={inp} value={med.name ?? ''} onChange={e => updateMed('name', e.target.value)} placeholder={`Med ${i+1}`} />
                    <input style={inp} value={med.dosage ?? ''} onChange={e => updateMed('dosage', e.target.value)} placeholder="e.g. 10mg daily" />
                    <input style={inp} value={med.condition ?? ''} onChange={e => updateMed('condition', e.target.value)} placeholder="e.g. Blood pressure" />
                    <input style={inp} value={med.doctor ?? ''} onChange={e => updateMed('doctor', e.target.value)} placeholder="Dr. Smith" />
                    <input style={inp} value={med.duration ?? ''} onChange={e => updateMed('duration', e.target.value)} placeholder="2 yrs" />
                  </div>
                )
              })}
            </div>
          )}

          {/* Section 8 - Existing Insurance */}
          {sectionHeader(8, 'Existing Life Insurance Coverage')}
          {[0,1].map(i => {
            const ins = client.existing_insurance[i] ?? {}
            const updateIns = (field: string, value: string) => {
              const updated = [...client.existing_insurance]
              updated[i] = { ...updated[i], [field]: value }
              upd('existing_insurance', updated)
            }
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={lbl}>Insurance Company {i+1}</label><input style={inp} value={ins.company ?? ''} onChange={e => updateIns('company', e.target.value)} /></div>
                <div><label style={lbl}>Policy Type</label><input style={inp} value={ins.type ?? ''} onChange={e => updateIns('type', e.target.value)} /></div>
                <div><label style={lbl}>Coverage Amount ($)</label><input type="number" style={inp} value={ins.amount ?? ''} onChange={e => updateIns('amount', e.target.value)} /></div>
              </div>
            )
          })}

          {/* Section 9 - Bank Info */}
          {sectionHeader(9, 'Bank / Payment Information')}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>Bank Name</label><input style={inp} value={client.bank_name} onChange={e => upd('bank_name', e.target.value)} /></div>
            <div><label style={lbl}>City</label><input style={inp} value={client.bank_city} onChange={e => upd('bank_city', e.target.value)} /></div>
            <div><label style={lbl}>State</label><input style={inp} value={client.bank_state} onChange={e => upd('bank_state', e.target.value)} maxLength={2} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>Routing / Transit Number</label><input style={inp} value={client.bank_routing_number} onChange={e => upd('bank_routing_number', e.target.value)} /></div>
            <div><label style={lbl}>Account Number</label><input style={inp} value={client.bank_account_number} onChange={e => upd('bank_account_number', e.target.value)} /></div>
          </div>

          {/* Section 10 - Agent Notes */}
          {sectionHeader(10, 'Agent Notes / Additional Information')}
          <div style={{ marginBottom: '24px' }}>
            <textarea style={{ ...inp, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} value={client.agent_notes} onChange={e => upd('agent_notes', e.target.value)} placeholder="Any additional notes or information about this client..." />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #E5E1DA' }}>
            <button type="button" onClick={() => router.push('/crm')} style={{ padding: '11px 20px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '11px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving...' : 'Save Client & Continue →'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2 — POLICY DETAILS */}
      {step === 'policy' && (
        <form onSubmit={handlePolicySubmit}>
          <div style={{ padding: '16px', backgroundColor: '#F0FAF4', border: '1px solid #C8E6C9', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#2E7D32' }}>
            ✓ Client saved successfully. Now add their policy details.
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0EDE8', fontSize: '12px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#FAFAF8' }}>Policy Information</div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Carrier *</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={policy.carrier} onChange={e => updPolicy('carrier', e.target.value)} required>
                    <option value="">Select carrier</option>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Product Type *</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={policy.product_type} onChange={e => updPolicy('product_type', e.target.value)} required>
                    <option value="">Select product</option>
                    {PRODUCT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={lbl}>Policy Number</label><input style={inp} value={policy.policy_number} onChange={e => updPolicy('policy_number', e.target.value)} placeholder="e.g. MO-12345678" /></div>
                <div>
                  <label style={lbl}>Policy Status</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={policy.status} onChange={e => updPolicy('status', e.target.value)}>
                    {POLICY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div><label style={lbl}>Face Amount ($)</label><input type="number" style={inp} value={policy.face_amount} onChange={e => updPolicy('face_amount', e.target.value)} placeholder="250000" /></div>
                <div>
                  <label style={lbl}>Monthly Premium ($)</label>
                  <input
                    type="number"
                    style={inp}
                    value={policy.monthly_premium}
                    onChange={e => {
                      const monthly = e.target.value
                      const annual = monthly ? (parseFloat(monthly) * 12).toFixed(2) : ''
                      setPolicy(prev => ({ ...prev, monthly_premium: monthly, annual_premium: annual }))
                    }}
                    placeholder="0.00"
                  />
                  {policy.monthly_premium && (
                    <p style={{ fontSize: '11px', color: '#7A7A7A', marginTop: '4px' }}>
                      Annual: ${(parseFloat(policy.monthly_premium) * 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div>
                  <label style={lbl}>Annual Premium ($)</label>
                  <input
                    type="number"
                    style={inp}
                    value={policy.annual_premium}
                    onChange={e => {
                      const annual = e.target.value
                      const monthly = annual ? (parseFloat(annual) / 12).toFixed(2) : ''
                      setPolicy(prev => ({ ...prev, annual_premium: annual, monthly_premium: monthly }))
                    }}
                    placeholder="0.00"
                  />
                  {policy.annual_premium && (
                    <p style={{ fontSize: '11px', color: '#7A7A7A', marginTop: '4px' }}>
                      Monthly: ${(parseFloat(policy.annual_premium) / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={lbl}>Date Written *</label><input type="date" style={inp} value={policy.date_written} onChange={e => updPolicy('date_written', e.target.value)} required /></div>
                <div><label style={lbl}>Effective Date</label><input type="date" style={inp} value={policy.effective_date} onChange={e => updPolicy('effective_date', e.target.value)} /></div>
              </div>
              <div><label style={lbl}>Policy Notes</label><textarea style={{ ...inp, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} value={policy.notes} onChange={e => updPolicy('notes', e.target.value)} /></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => { setSkipPolicy(true); setStep('done') }} style={{ padding: '11px 20px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
              Skip — Add Policy Later
            </button>
            <button type="submit" disabled={loading} style={{ padding: '11px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving...' : 'Save Policy →'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3 — DONE */}
      {step === 'done' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E1DA', padding: '48px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#F0FAF4', border: '2px solid #C8E6C9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px' }}>✓</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>Client {skipPolicy ? 'Added' : '& Policy Saved'}!</h2>
          <p style={{ fontSize: '14px', color: '#7A7A7A', marginBottom: '28px' }}>
            {skipPolicy ? 'Client saved. You can add a policy anytime from their profile.' : 'The client and policy have been logged to your book of business.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push(`/crm/clients/${createdClientId}`)} style={{ padding: '11px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              View Client Profile
            </button>
            <button onClick={() => { setStep('client'); setCreatedClientId(null); setSkipPolicy(false); setError(''); setShowTip(true); setClient({ first_name: '', last_name: '', date_of_birth: '', email: '', phone: '', city: '', state: '', zip: '', health_status: '', tobacco_user: false, health_notes: '', notes: '', middle_name: '', gender: '', address_line1: '', best_time_to_call: '', ssn: '', drivers_license_number: '', drivers_license_expiration: '', drivers_license_state: '', us_citizen: null, country_of_birth: 'U.S.', employer_name: '', employer_address: '', employer_city: '', employer_state: '', employer_zip: '', annual_income: '', estimated_net_worth: '', num_dependents: '', dependent_ages: '', health_q1: null, health_q2: null, health_q3: null, health_q4: null, health_q5: null, health_q6: null, health_q7: null, health_q8: null, health_q9: null, tobacco_product_type: '', tobacco_last_use: '', beneficiary_primary1_name: '', beneficiary_primary1_relationship: '', beneficiary_primary1_phone: '', beneficiary_primary1_share: '', beneficiary_primary2_name: '', beneficiary_primary2_relationship: '', beneficiary_primary2_phone: '', beneficiary_primary2_share: '', beneficiary_contingent_name: '', beneficiary_contingent_relationship: '', beneficiary_contingent_phone: '', beneficiary_contingent_share: '', medications: [{},{},{},{},{}], no_current_medications: false, existing_insurance: [{},{}], bank_name: '', bank_city: '', bank_state: '', bank_routing_number: '', bank_account_number: '', agent_notes: '' }); setPolicy({ carrier: '', product_type: '', policy_number: '', face_amount: '', monthly_premium: '', annual_premium: '', date_written: new Date().toISOString().split('T')[0], effective_date: '', status: 'pending', notes: '' }) }} style={{ padding: '11px 20px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
              + Add Another Client
            </button>
            <button onClick={() => router.push('/crm')} style={{ padding: '11px 20px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
