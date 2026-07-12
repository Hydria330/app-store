import { NextResponse } from "next/server"

const DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3.2"
const ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions"

function resolveApiKey(bodyKey?: string) {
  return bodyKey || process.env.SILICON_FLOW_API_KEY || process.env.OPENAI_API_KEY || ""
}

async function callChatCompletions(params: {
  apiKey: string
  model: string
  messages: { role: string; content: string }[]
  temperature?: number
  jsonMode?: boolean
}) {
  const { apiKey, model, messages, temperature = 0.2, jsonMode = false } = params
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  })

  const json = await res.json()
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `HTTP ${res.status}`
    return NextResponse.json({ error: msg, detail: json }, { status: res.status })
  }
  return NextResponse.json(json)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const apiKey = resolveApiKey(body.apiKey)

    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 LLM API Key。请在页面填写密钥，或在 .env.local 中设置 SILICON_FLOW_API_KEY。" },
        { status: 400 },
      )
    }

    // 新流水线格式：system + user，返回 JSON 对象
    if (body.system && body.user) {
      return callChatCompletions({
        apiKey,
        model: body.model || DEFAULT_MODEL,
        messages: [
          { role: "system", content: body.system },
          { role: "user", content: body.user },
        ],
        temperature: body.temperature ?? 0.2,
        jsonMode: true,
      })
    }

    // 旧格式：单条 prompt + data 占位符替换
    const { prompt, data } = body
    if (!prompt) {
      return NextResponse.json({ error: "缺少 prompt 或 system/user 参数" }, { status: 400 })
    }

    const filledPrompt = String(prompt)
      .replace("{{reviewData}}", JSON.stringify(data))
      .replace("{{painPointList}}", JSON.stringify(data))
      .replace("{{prdContent}}", JSON.stringify(data))

    return callChatCompletions({
      apiKey,
      model: body.model || DEFAULT_MODEL,
      messages: [{ role: "user", content: filledPrompt }],
      temperature: 0.1,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
