import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { agentName, agentEmail, xfgEmail, npn, states } = await request.json()

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: process.env.FROM_EMAIL || 'noreply@xfg.software',
    to: ['finley@xfgteam.com', 'nick@xfgteam.com'],
    subject: `New Agent Ready for Contracting — ${agentName}`,
    html: `
      <div style="font-family: Inter, sans-serif; background: #F5F2ED; padding: 40px; max-width: 600px; margin: 0 auto;">
        <p style="color: #C9A96E; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px;">XFG · X Financial Group</p>
        <h1 style="color: #1A1814; font-size: 24px; font-weight: 700; margin-bottom: 8px;">New Agent Ready for Contracting</h1>
        <p style="color: #6B6966; font-size: 16px; margin-bottom: 32px;">An agent has submitted their contracting information and is ready to be contracted.</p>

        <div style="background: #FFFFFF; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #C9A96E;">
          <p style="color: #6B6966; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;">Agent Details</p>
          <p style="color: #1A1814; font-size: 15px; font-weight: 600; margin-bottom: 8px;">Name: ${agentName}</p>
          <p style="color: #1A1814; font-size: 15px; margin-bottom: 8px;">Personal Email: ${agentEmail}</p>
          <p style="color: #1A1814; font-size: 15px; margin-bottom: 8px;">XFG Email: ${xfgEmail || 'Not set'}</p>
          <p style="color: #1A1814; font-size: 15px; margin-bottom: 8px;">NPN: ${npn || 'Not provided'}</p>
          <p style="color: #1A1814; font-size: 15px;">Licensed States: ${states || 'Not provided'}</p>
        </div>

        <a href="https://app.xfg.software/pipeline" style="display: inline-block; background: #C9A96E; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Agent in Platform →</a>

        <p style="color: #9A9890; font-size: 12px; margin-top: 32px; text-align: center;">XFG Financial Group · All 50 States</p>
      </div>
    `
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
