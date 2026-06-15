import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://app.xfg.software/api/auth/google/callback'
)

export async function POST(req: NextRequest) {
  try {
    const { agentId, event } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get agent's Google tokens
    const { data: agent } = await supabase
      .from('agents')
      .select('google_access_token, google_refresh_token, google_token_expiry, google_calendar_connected')
      .eq('id', agentId)
      .single()

    if (!agent?.google_calendar_connected || !agent?.google_access_token) {
      return NextResponse.json({ synced: false, reason: 'not_connected' })
    }

    // Set credentials
    oauth2Client.setCredentials({
      access_token: agent.google_access_token,
      refresh_token: agent.google_refresh_token,
      expiry_date: agent.google_token_expiry ? new Date(agent.google_token_expiry).getTime() : undefined,
    })

    // Refresh token if needed
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await supabase.from('agents').update({
          google_access_token: tokens.access_token,
          google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        }).eq('id', agentId)
      }
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Build event datetime
    const startDateTime = event.event_time
      ? `${event.event_date}T${event.event_time}:00`
      : `${event.event_date}T09:00:00`
    const endDateTime = event.event_time
      ? `${event.event_date}T${event.event_time.split(':')[0]}:${String(parseInt(event.event_time.split(':')[1]) + 30).padStart(2, '0')}:00`
      : `${event.event_date}T10:00:00`

    const googleEvent = {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Chicago',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Chicago',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: googleEvent,
    })

    // Store Google event ID for future updates/deletes
    await supabase
      .from('crm_events')
      .update({ google_event_id: response.data.id })
      .eq('id', event.id)

    return NextResponse.json({ synced: true, googleEventId: response.data.id })
  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return NextResponse.json({ synced: false, error: 'sync_failed' })
  }
}
