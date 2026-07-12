// LLM 调用层：经 Next.js API Route 代理，规避浏览器 CORS；密钥可本地填写或走 .env.local
import { putAudit } from "./db"

export class LLMError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = "LLMError"
  }
}

const DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3.2"

export async function callLLMJson<T>(params: {
  apiKey: string
  appId: string
  stage: string
  system: string
  user: string
  model?: string
}): Promise<T> {
  const { apiKey, appId, stage, system, user, model = DEFAULT_MODEL } = params

  await putAudit("llm", {
    key: `${appId}-${stage}-input-${Date.now()}`,
    appId,
    createdAt: Date.now(),
    type: `${stage}:input`,
    payload: { model, system, user },
  })

  let res: Response
  try {
    res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, model, system, user }),
    })
  } catch {
    throw new LLMError("无法连接 LLM 代理接口（网络问题）。")
  }

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error || `接口异常（${res.status}）`
    if (res.status === 401) throw new LLMError("LLM API Key 无效或已过期（401）。")
    if (res.status === 429) throw new LLMError("LLM 调用超出配额或限流（429）。")
    throw new LLMError(typeof msg === "string" ? msg : JSON.stringify(msg))
  }

  const content: string = data?.choices?.[0]?.message?.content ?? ""

  await putAudit("llm", {
    key: `${appId}-${stage}-output-${Date.now()}`,
    appId,
    createdAt: Date.now(),
    type: `${stage}:output`,
    payload: data,
  })

  try {
    return JSON.parse(content) as T
  } catch {
    throw new LLMError("LLM 返回内容非合法 JSON，已中断以避免伪造数据。")
  }
}
