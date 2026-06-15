import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://app.xfg.software/api/auth/google/callback'
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const agentId = searchParams.get('state')

  if (!code || !agentId) {
    return NextResponse.redirect('https://app.xfg.software/crm/calendar?error=missing_params')
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Store tokens in agents table
    await supabase
      .from('agents')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)

    return NextResponse.redirect('https://app.xfg.software/crm/calendar?connected=true')
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect('https://app.xfg.software/crm/calendar?error=oauth_failed')
  }
}
