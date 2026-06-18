import { NextRequest, NextResponse } from 'next/server'

const GHL_API_TOKEN = process.env.GHL_API_TOKEN
const GHL_LOCATION_ID = 'JF2XVvngi063A0eMpdit'

export async function POST(req: NextRequest) {
  try {
    const { agents, message } = await req.json()

    if (!agents || !agents.length || !message) {
      return NextResponse.json({ error: 'Missing agents or message' }, { status: 400 })
    }

    const results = []

    for (const agent of agents) {
      if (!agent.phone) {
        results.push({ name: agent.full_name, status: 'skipped', reason: 'no phone number' })
        continue
      }

      try {
        // First create/find contact in GHL
        const contactRes = await fetch(`https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${GHL_LOCATION_ID}&number=${encodeURIComponent(agent.phone)}`, {
          headers: {
            'Authorization': `Bearer ${GHL_API_TOKEN}`,
            'Version': '2021-07-28',
          }
        })

        let contactId = null

        if (contactRes.ok) {
          const contactData = await contactRes.json()
          contactId = contactData?.contact?.id
        }

        // If no contact found, create one
        if (!contactId) {
          const createRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GHL_API_TOKEN}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firstName: agent.full_name?.split(' ')[0] || agent.full_name,
              lastName: agent.full_name?.split(' ').slice(1).join(' ') || '',
              phone: agent.phone,
              email: agent.email,
              locationId: GHL_LOCATION_ID,
              tags: ['XFG Agent'],
            })
          })

          if (createRes.ok) {
            const createData = await createRes.json()
            contactId = createData?.contact?.id
          }
        }

        if (!contactId) {
          results.push({ name: agent.full_name, status: 'failed', reason: 'could not find or create GHL contact - check API token scopes' })
          continue
        }

        // Send SMS message
        const msgRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GHL_API_TOKEN}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'SMS',
            contactId,
            locationId: GHL_LOCATION_ID,
            message,
          })
        })

        if (msgRes.ok) {
          results.push({ name: agent.full_name, status: 'sent' })
        } else {
          const errText = await msgRes.text()
          results.push({ name: agent.full_name, status: 'failed', reason: errText })
        }

      } catch (err) {
        results.push({ name: agent.full_name, status: 'failed', reason: 'request error' })
      }
    }

    const sent = results.filter(r => r.status === 'sent').length
    const failed = results.filter(r => r.status === 'failed').length
    const skipped = results.filter(r => r.status === 'skipped').length

    return NextResponse.json({ success: true, sent, failed, skipped, results })

  } catch (error) {
    console.error('GHL SMS error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
