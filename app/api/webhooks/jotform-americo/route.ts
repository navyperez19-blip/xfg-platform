import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // JotForm sends form fields as form data
    // Extract agent email from the submission
    let agentEmail = ''

    for (const [, value] of formData.entries()) {
      const valStr = String(value).toLowerCase()
      if (valStr.includes('@') && valStr.includes('.')) {
        agentEmail = String(value).trim().toLowerCase()
        break
      }
    }

    if (!agentEmail) {
      console.error('No email found in JotForm submission')
      return NextResponse.json({ error: 'No email found' }, { status: 400 })
    }

    // Find agent by email
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, full_name, email')
      .ilike('email', agentEmail)
      .single()

    if (agentError || !agent) {
      console.error('Agent not found for email:', agentEmail)
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Mark form as submitted
    await supabase
      .from('agents')
      .update({
        americo_form_submitted: true,
        americo_form_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent.id)

    // Send bell notifications to all admins
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .in('role', ['superadmin', 'executive'])

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: any) => ({
        recipient_id: admin.id,
        agent_id: agent.id,
        type: 'americo_form_submitted',
        title: 'Americo Form Submitted',
        message: `${agent.full_name} has submitted their Americo Hierarchy & Commission form. Review and unlock their SureLC link.`,
        is_read: false,
        created_at: new Date().toISOString(),
      }))
      await supabase.from('notifications').insert(notifications)
    }

    // Send email to Nick and Finley
    await resend.emails.send({
      from: 'XFG Platform <noreply@xfinancialgroup.com>',
      to: ['nick@xfgteam.com', 'finley@xfgteam.com'],
      subject: `Americo Form Submitted — ${agent.full_name}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="margin-bottom: 24px;">
            <p style="color: #C9A96E; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px;">XFG · X Financial Group</p>
            <h1 style="color: #1A1814; font-size: 24px; font-weight: 700; margin-bottom: 8px;">Americo Form Submitted</h1>
          </div>
          <div style="background: #F5F2ED; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #1A1814; font-size: 16px; font-weight: 600; margin-bottom: 4px;">${agent.full_name}</p>
            <p style="color: #6B6966; font-size: 14px;">${agent.email}</p>
          </div>
          <p style="color: #4A4A4A; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            This agent has submitted their Americo Hierarchy & Commission Level + Direct Deposit Authorization Form.
            Please review the submission and unlock their Americo SureLC contracting link in the platform.
          </p>
          <a href="https://app.xfg.software/crm/admin/agents/${agent.id}"
             style="display: inline-block; background: #C9A96E; color: #1A1814; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
            Review & Unlock →
          </a>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('JotForm webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
