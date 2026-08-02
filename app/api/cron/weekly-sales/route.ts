import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const CARRIERS = ['Ethos', 'Americo', 'Mutual of Omaha', 'MOO', 'AIG', 'Core Bridge', 'Corebridge', 'Core', 'Aflac', 'Transamerica', 'UHL', 'AHL']
const GUILD_ID = '1497790255238086787'

function normalizeCarrier(carrier: string): string {
  if (carrier === 'MOO') return 'Mutual of Omaha'
  if (carrier === 'Core Bridge' || carrier === 'Corebridge' || carrier === 'Core') return 'Corebridge'
  return carrier
}

const MANUAL_NAME_OVERRIDES: Record<string, string> = {
  'brandon_goff': 'Brandon Goff',
  'jslzr.': 'Jesus Salazar',
  'vomalities': 'Ryan Keeling',
  'maryemmaclark': 'MaryEmma Mcrae',
  'alexlines.xfg': 'Alex Lines',
  'caden_heck10': 'Caden Heck',
  'rfanning.': 'Richard Fanning',
  'karleysells': 'Karley Lipke',
  'tristanperez1': 'Tristan Perez',
  'the_takiyah': 'Takiyah Campbell',
  'lathanb': 'Lathan Bourgeois',
  '22jchap': 'Justice Chapman',
  'andrew_higdon': 'Andy Higdon',
  'david_73668': 'David Snyder',
  'pdstuffy': 'Ben Smedshammer',
}

async function getDiscordDisplayNames(botToken: string, guildId: string): Promise<Record<string, string>> {
  const nameMap: Record<string, string> = {}
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
      headers: { Authorization: `Bot ${botToken}` }
    })
    const members = await res.json()
    if (Array.isArray(members)) {
      for (const m of members) {
        const username = m.user?.username
        const displayName = MANUAL_NAME_OVERRIDES[username] || m.nick || m.user?.global_name || username
        if (username) nameMap[username] = displayName
      }
    }
  } catch (e) {
    // fail silently, fall back to usernames
  }
  return nameMap
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
    const CHANNEL_ID = process.env.DISCORD_SALES_CHANNEL_ID!

    const now = new Date()
    const lookback = new Date(now)
    lookback.setDate(lookback.getDate() - 10) // small overlap buffer, ON CONFLICT handles dupes

    let allMessages: any[] = []
    let before: string | null = null

    for (let i = 0; i < 10; i++) {
      let url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`
      if (before) url += `&before=${before}`

      const res = await fetch(url, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
      })
      const batch = await res.json()

      if (!Array.isArray(batch) || batch.length === 0) break

      allMessages = allMessages.concat(batch)
      before = batch[batch.length - 1].id
      const lastTs = new Date(batch[batch.length - 1].timestamp)
      if (lastTs < lookback) break
    }

    const recentMessages = allMessages.filter(m => new Date(m.timestamp) >= lookback)
    const displayNames = await getDiscordDisplayNames(DISCORD_BOT_TOKEN, GUILD_ID)

    const records: any[] = []
    for (const msg of recentMessages) {
      const content = msg.content as string
      const rawUsername = msg.author.username as string

      if (rawUsername.toLowerCase() === 'mikeibraimi') continue

      // Skip replies (celebratory/hype responses), only process original top-level posts
      if (msg.message_reference) continue

      // Require the dollar/number amount to appear near the start of the message,
      // matching the real sale-post format (e.g. "$904.80 Ethos Whole Life")
      const startsWithAmount = /^\s*\$?[\d,]+(?:\.\d+)?/.test(content)
      if (!startsWithAmount) continue

      let foundCarrier: string | null = null
      for (const c of CARRIERS) {
        if (content.toLowerCase().includes(c.toLowerCase())) {
          foundCarrier = normalizeCarrier(c)
          break
        }
      }
      if (!foundCarrier) continue

      const numMatch = content.match(/\$?([\d,]+(?:\.\d+)?)/)
      if (!numMatch) continue
      const amount = parseFloat(numMatch[1].replace(/,/g, ''))
      if (isNaN(amount) || amount <= 0) continue

      const displayName = displayNames[rawUsername] || rawUsername
      const saleDate = new Date(msg.timestamp).toISOString().split('T')[0]

      records.push({
        discord_message_id: msg.id,
        sale_date: saleDate,
        agent_name: displayName,
        carrier: foundCarrier,
        amount: amount
      })
    }

    let inserted = 0
    if (records.length > 0) {
      const { error, count } = await supabase
        .from('discord_sales_records')
        .upsert(records, { onConflict: 'discord_message_id', ignoreDuplicates: true, count: 'exact' })

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      inserted = count || 0
    }

    return NextResponse.json({ success: true, messagesScanned: recentMessages.length, recordsProcessed: records.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
