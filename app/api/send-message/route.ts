import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { agentEmail, agentName, senderName, message } = await request.json()

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: process.env.FROM_EMAIL || 'noreply@xfg.software',
    to: agentEmail,
    subject: 'New message from your XFG team',
    html: `
      <div style="font-family: Inter, sans-serif; background: #F5F2ED; padding: 40px; max-width: 600px; margin: 0 auto;">
        <p style="color: #C9A96E; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px;">XFG · X Financial Group</p>
        <h1 style="color: #1A1814; font-size: 24px; font-weight: 700; margin-bottom: 8px;">Hi ${agentName},</h1>
        <p style="color: #6B6966; font-size: 16px; margin-bottom: 32px;">You have a new message from your XFG team.</p>
        <div style="background: #FFFFFF; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #C9A96E;">
          <p style="color: #6B6966; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Message from ${senderName}</p>
          <p style="color: #1A1814; font-size: 16px; line-height: 1.6;">${message}</p>
        </div>
        <a href="https://app.xfg.software/agent-portal" style="display: inline-block; background: #C9A96E; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in Portal →</a>
        <p style="color: #9A9890; font-size: 12px; margin-top: 32px; text-align: center;">XFG Financial Group · All 50 States</p>
      </div>
    `
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
