import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const CARRIERS = ['Ethos', 'Americo', 'Mutual of Omaha', 'MOO', 'AIG', 'Core Bridge', 'Corebridge', 'Aflac', 'Transamerica', 'UHL', 'AHL']
const GUILD_ID = '1497790255238086787'

function normalizeCarrier(carrier: string): string {
  if (carrier === 'MOO') return 'Mutual of Omaha'
  if (carrier === 'Core Bridge' || carrier === 'Corebridge') return 'Corebridge'
  return carrier
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
        const displayName = m.nick || m.user?.global_name || username
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
    const weekEnd = new Date(now)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)

    let allMessages: any[] = []
    let before: string | null = null

    for (let i = 0; i < 20; i++) {
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
      if (lastTs < weekStart) break
    }

    const weekMessages = allMessages.filter(m => new Date(m.timestamp) >= weekStart)

    const displayNames = await getDiscordDisplayNames(DISCORD_BOT_TOKEN, GUILD_ID)

    const byCarrier: Record<string, { totalAP: number; count: number }> = {}
    const byAgent: Record<string, { totalAP: number; carriers: Set<string> }> = {}

    for (const msg of weekMessages) {
      const content = msg.content as string
      const rawUsername = msg.author.username as string
      const author = displayNames[rawUsername] || rawUsername

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

      if (!byCarrier[foundCarrier]) byCarrier[foundCarrier] = { totalAP: 0, count: 0 }
      byCarrier[foundCarrier].totalAP += amount
      byCarrier[foundCarrier].count += 1

      if (!byAgent[author]) byAgent[author] = { totalAP: 0, carriers: new Set() }
      byAgent[author].totalAP += amount
      byAgent[author].carriers.add(foundCarrier)
    }

    const byCarrierArray = Object.entries(byCarrier).map(([carrier, data]) => ({
      carrier, totalAP: Math.round(data.totalAP * 100) / 100, count: data.count
    })).sort((a, b) => b.totalAP - a.totalAP)

    const byAgentArray = Object.entries(byAgent).map(([agent, data]) => ({
      agent, totalAP: Math.round(data.totalAP * 100) / 100, carriers: Array.from(data.carriers)
    })).sort((a, b) => b.totalAP - a.totalAP)

    const totalAP = byCarrierArray.reduce((sum, c) => sum + c.totalAP, 0)
    const totalSales = byCarrierArray.reduce((sum, c) => sum + c.count, 0)

    const { error: insertError } = await supabase.from('weekly_sales_snapshot').insert({
      week_start: weekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0],
      by_carrier: byCarrierArray,
      by_agent: byAgentArray,
      total_ap: totalAP,
      total_sales: totalSales,
    })

    if (insertError) {
      return NextResponse.json({ success: false, insertError: insertError.message, totalAP, totalSales }, { status: 500 })
    }

    return NextResponse.json({ success: true, totalAP, totalSales, byCarrierArray, byAgentArray })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
