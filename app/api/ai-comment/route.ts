import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const maxDuration = 30

// Fake human usernames the AI will post as
const AI_PERSONAS = [
  { username: 'jake_vibes', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=jake' },
  { username: 'mia.moments', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=mia' },
  { username: 'dev_tyler99', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=tyler' },
  { username: 'sophiax__', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=sophia' },
  { username: 'noahkool22', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=noah' },
  { username: 'lia.lens', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=lia' },
  { username: 'marcus_feeds', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=marcus' },
  { username: 'zoe_createss', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=zoe' },
  { username: 'ben.scrolls', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=ben' },
  { username: 'ayla_watchess', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=ayla' },
]

async function generateAIComment(caption: string, persona: typeof AI_PERSONAS[0]): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  const systemPrompt = `You are a real social media user named ${persona.username}. 
You're leaving a short, casual comment on a video post. 
Act completely human — no AI vibes, no formal language, no hashtags unless they feel natural. 
Keep it under 20 words. Be genuine, sometimes funny, sometimes short, sometimes just react. 
Vary your style. Never start with "I" repeatedly. No emojis unless very natural. Just the comment text, nothing else.`

  const userPrompt = caption
    ? `The video caption is: "${caption}". Leave a natural comment.`
    : `Leave a short natural comment on this video.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://feather.app',
        'X-Title': 'Feather Social',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 60,
        temperature: 1.1,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content?.trim()
    if (!text) return null
    // Strip quotes if the model wrapped in them
    return text.replace(/^["']|["']$/g, '').trim()
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const { oat_id, caption } = await req.json()
    if (!oat_id) return NextResponse.json({ error: 'oat_id required' }, { status: 400 })

    const supabase = createServiceClient()

    // Pick a random persona
    const persona = AI_PERSONAS[Math.floor(Math.random() * AI_PERSONAS.length)]

    // Generate comment
    const comment = await generateAIComment(caption ?? '', persona)
    if (!comment) return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })

    // Insert as AI comment — expires in 30 hours
    const { data, error } = await supabase
      .from('oat_comments')
      .insert({
        oat_id,
        user_id: null,
        ai_username: persona.username,
        ai_avatar_url: persona.avatar,
        is_ai: true,
        content: comment,
        expires_at: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Bump comments_count on the oat (manual increment)
    const { data: oatRow } = await supabase
      .from('oats')
      .select('comments_count')
      .eq('id', oat_id)
      .single()
    if (oatRow) {
      await supabase.from('oats').update({ comments_count: (oatRow.comments_count ?? 0) + 1 }).eq('id', oat_id)
    }

    return NextResponse.json({ ok: true, comment: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
