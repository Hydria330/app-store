// OpenAI 调用层（纯前端直连，密钥仅本地 LocalStorage 存储，不上传任何服务器）
// 每次调用的输入数据集与输出结果均存入 IndexedDB 存证
import { putAudit } from "./db"

export class LLMError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = "LLMError"
  }
}

const ENDPOINT = "https://api.openai.com/v1/chat/completions"

export async function callLLMJson<T>(params: {
  apiKey: string
  appId: string
  stage: string
  system: string
  user: string
  model?: string
}): Promise<T> {
  const { apiKey, appId, stage, system, user, model = "gpt-4o-mini" } = params
  if (!apiKey) throw new LLMError("未填写 OpenAI API Key，无法进行分析。")

  // 存证：LLM 输入数据集（约束：仅基于本地传入的清洗评论输出结论）
  await putAudit("llm", {
    key: `${appId}-${stage}-input-${Date.now()}`,
    appId,
    createdAt: Date.now(),
    type: `${stage}:input`,
    payload: { model, system, user },
  })

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    })
  } catch {
    throw new LLMError("无法连接 OpenAI 接口（网络或 CORS 问题）。")
  }

  if (res.status === 401) throw new LLMError("OpenAI API Key 无效或已过期（401）。")
  if (res.status === 429) throw new LLMError("OpenAI 调用超出配额或限流（429）。")
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new LLMError(`OpenAI 接口异常（${res.status}）：${t.slice(0, 200)}`)
  }

  const data = await res.json()
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
