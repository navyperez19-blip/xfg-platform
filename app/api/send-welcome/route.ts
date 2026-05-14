import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { full_name, email, xfg_id, state } = await request.json()

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: process.env.FROM_EMAIL || 'noreply@xfg.software',
    to: email,
    subject: 'Welcome to XFG — Your Agent Account is Active',
    html: `
      <div style="font-family: Georgia, serif; background: #0F0F0E; color: #F5F2ED; padding: 40px; max-width: 600px; margin: 0 auto;">
        <p style="color: #C9A96E; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px;">XFG · X Financial Group</p>
        <h1 style="color: #F5F2ED; font-size: 28px; font-weight: 400; margin-bottom: 8px;">Welcome, ${full_name}.</h1>
        <p style="color: #9A9890; font-size: 16px; margin-bottom: 32px; font-style: italic;">Your agent account has been created.</p>
        <div style="background: #1A1917; border: 1px solid #2E2C29; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #9A9890; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;">Your XFG ID</p>
          <p style="color: #C9A96E; font-family: monospace; font-size: 24px; font-weight: 700;">${xfg_id}</p>
        </div>
        <div style="background: #1A1917; border: 1px solid #2E2C29; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #9A9890; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px;">Your Details</p>
          <p style="color: #F5F2ED; font-size: 14px; margin-bottom: 8px;">Name: ${full_name}</p>
          <p style="color: #F5F2ED; font-size: 14px; margin-bottom: 8px;">Email: ${email}</p>
          <p style="color: #F5F2ED; font-size: 14px;">State: ${state}</p>
        </div>
        <div style="background: #1A1917; border: 1px solid #2E2C29; border-radius: 10px; padding: 24px; margin-bottom: 32px;">
          <p style="color: #9A9890; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;">Next Steps</p>
          <p style="color: #F5F2ED; font-size: 14px; margin-bottom: 8px;">1. Log in to your portal at app.xfg.software</p>
          <p style="color: #F5F2ED; font-size: 14px; margin-bottom: 8px;">2. A member of our team will reach out to guide you through licensing</p>
          <p style="color: #F5F2ED; font-size: 14px;">3. Keep this email — your XFG ID is permanent</p>
        </div>
        <p style="color: #5C5A56; font-size: 12px; text-align: center;">XFG Financial Group · All 50 States · Built for producers who refuse to be average.</p>
      </div>
    `
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
