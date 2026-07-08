import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { apiKey, prompt, data } = await req.json()
    const filledPrompt = prompt
      .replace('{{reviewData}}', JSON.stringify(data))
      .replace('{{painPointList}}', JSON.stringify(data))
      .replace('{{prdContent}}', JSON.stringify(data))

    const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3.2',
        messages: [{ role: 'user', content: filledPrompt }],
        temperature: 0.1
      })
    })
    const json = await res.json()
    return NextResponse.json(json)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}