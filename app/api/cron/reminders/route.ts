import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

const GHL_API_TOKEN = process.env.GHL_API_TOKEN!
const GHL_LOCATION_ID = 'JF2XVvngi063A0eMpdit'

const STAGE_THRESHOLDS: Record<string, number> = {
  contacted: 2,
  licensing: 7,
  contracting: 2,
  system_setup: 2,
}

const STAGE_LABELS: Record<string, string> = {
  contacted: 'Contacted',
  licensing: 'Licensing',
  contracting: 'Contracting',
  system_setup: 'System Setup',
}

async function sendEmail(to: string, subject: string, html: string) {
  await resend.emails.send({
    from: 'XFG Team <no-reply@xfinancialgroup.com>',
    to,
    subject,
    html,
  })
}

async function sendSMS(phone: string, message: string) {
  await fetch('https://services.leadconnectorhq.com/conversations/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GHL_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Version': '2021-04-15',
    },
    body: JSON.stringify({
      type: 'SMS',
      message,
      phone,
      locationId: GHL_LOCATION_ID,
    }),
  })
}

function pipelineEmailHtml(firstName: string, stage: string, days: number) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <img src="https://xfinancialgroup.com/logo.png" alt="XFG" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #1A1A1A;">Time to Keep Moving, ${firstName}! 🚀</h2>
      <p style="color: #4A4A4A; font-size: 15px; line-height: 1.6;">
        Hey ${firstName}, just a friendly reminder that you've been in the <strong>${stage}</strong> stage for <strong>${days} days</strong>.
        Your next step is waiting — log in to your XFG portal and keep pushing forward. Every day counts!
      </p>
      <a href="https://app.xfg.software/agent-portal" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #C9A96E; color: #1A1A1A; text-decoration: none; border-radius: 8px; font-weight: 700;">
        Log In to XFG →
      </a>
      <p style="color: #AAA; font-size: 12px; margin-top: 32px;">— The XFG Team</p>
    </div>
  `
}

function followUpEmailHtml(firstName: string, clientName: string, dueDate: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <img src="https://xfinancialgroup.com/logo.png" alt="XFG" style="height: 40px; margin-bottom: 24px;" />
      <h2 style="color: #1A1A1A;">You Have an Overdue Follow-Up, ${firstName}</h2>
      <p style="color: #4A4A4A; font-size: 15px; line-height: 1.6;">
        Hey ${firstName}, your follow-up with <strong>${clientName}</strong> was due on <strong>${dueDate}</strong> and is still pending.
        Don't let this one slip — log in and take action now.
      </p>
      <a href="https://app.xfg.software/crm/clients" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #C9A96E; color: #1A1A1A; text-decoration: none; border-radius: 8px; font-weight: 700;">
        View Clients →
      </a>
      <p style="color: #AAA; font-size: 12px; margin-top: 32px;">— The XFG Team</p>
    </div>
  `
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { pipeline: { emails: 0, sms: 0 }, followups: { emails: 0, sms: 0 }, errors: [] as string[] }

  try {
    // --- PIPELINE REMINDERS ---
    const { data: agents } = await supabase
      .from('agents')
      .select('id, full_name, email, phone, current_stage, updated_at')
      .in('current_stage', ['contacted', 'licensing', 'contracting', 'system_setup'])

    const now = new Date()

    for (const agent of agents || []) {
      const firstName = agent.full_name?.split(' ')[0] || 'there'
      const stage = agent.current_stage
      const threshold = STAGE_THRESHOLDS[stage]
      const stageLabel = STAGE_LABELS[stage]
      const updatedAt = new Date(agent.updated_at)
      const daysInStage = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

      if (daysInStage < threshold) continue

      // Email on threshold day, SMS on threshold + 1 and every 2 days after
      const daysPastThreshold = daysInStage - threshold

      if (daysPastThreshold === 0 && agent.email) {
        try {
          await sendEmail(
            agent.email,
            `Time to Keep Moving, ${firstName}! 🚀`,
            pipelineEmailHtml(firstName, stageLabel, daysInStage)
          )
          results.pipeline.emails++
        } catch (e) {
          results.errors.push(`Pipeline email failed for ${agent.email}`)
        }
      }

      if (daysPastThreshold >= 1 && daysPastThreshold % 2 === 1 && agent.phone) {
        try {
          await sendSMS(
            agent.phone,
            `Hey ${firstName}! You've been in the ${stageLabel} stage for ${daysInStage} days. Time to keep moving! Log in here: app.xfg.software 💪 — XFG Team`
          )
          results.pipeline.sms++
        } catch (e) {
          results.errors.push(`Pipeline SMS failed for ${agent.phone}`)
        }
      }
    }

    // --- FOLLOW-UP REMINDERS ---
    const today = now.toISOString().split('T')[0]

    const { data: overdueNotes } = await supabase
      .from('crm_notes')
      .select(`
        id,
        follow_up_date,
        agent_id,
        client_id,
        crm_clients (first_name, last_name),
        agents (full_name, email, phone)
      `)
      .lt('follow_up_date', today)
      .eq('completed', false)

    for (const note of overdueNotes || []) {
      const agent = note.agents as any
      const client = note.crm_clients as any
      if (!agent || !client) continue

      const firstName = agent.full_name?.split(' ')[0] || 'there'
      const clientName = `${client.first_name} ${client.last_name}`
      const dueDate = new Date(note.follow_up_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const daysOverdue = Math.floor((now.getTime() - new Date(note.follow_up_date).getTime()) / (1000 * 60 * 60 * 24))

      // Email on day 1 overdue, SMS on day 2 and every 2 days after
      if (daysOverdue === 1 && agent.email) {
        try {
          await sendEmail(
            agent.email,
            `You Have an Overdue Follow-Up, ${firstName}`,
            followUpEmailHtml(firstName, clientName, dueDate)
          )
          results.followups.emails++
        } catch (e) {
          results.errors.push(`Follow-up email failed for ${agent.email}`)
        }
      }

      if (daysOverdue >= 2 && daysOverdue % 2 === 0 && agent.phone) {
        try {
          await sendSMS(
            agent.phone,
            `Hey ${firstName}! Your follow-up with ${clientName} is overdue. Log in and take action: app.xfg.software — XFG Team`
          )
          results.followups.sms++
        } catch (e) {
          results.errors.push(`Follow-up SMS failed for ${agent.phone}`)
        }
      }
    }

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, results })
}
