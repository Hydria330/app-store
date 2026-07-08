// IndexedDB 存证层：所有原始 API 返回与 LLM 输入数据集永久存档，可导出复现核验
import { openDB, type IDBPDatabase } from "idb"

const DB_NAME = "appstore-review-audit"
const DB_VERSION = 1

// 存储桶：
// raw   -> 原始 API 返回 JSON 凭证
// llm   -> 每次 LLM 调用的输入/输出数据集
// snapshot -> 全流水线快照
export type AuditStore = "raw" | "llm" | "snapshot"

export interface AuditRecord {
  key: string
  appId: string
  createdAt: number
  type: string
  payload: unknown
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (typeof window === "undefined") return null
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const store of ["raw", "llm", "snapshot"] as AuditStore[]) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: "key" })
          }
        }
      },
    })
  }
  return dbPromise
}

export async function putAudit(store: AuditStore, record: AuditRecord) {
  const db = await getDB()
  if (!db) return
  await db.put(store, record)
}

export async function getAllAudit(store: AuditStore): Promise<AuditRecord[]> {
  const db = await getDB()
  if (!db) return []
  return (await db.getAll(store)) as AuditRecord[]
}

export async function countAudit(store: AuditStore): Promise<number> {
  const db = await getDB()
  if (!db) return 0
  return db.count(store)
}

export async function clearAudit(store: AuditStore) {
  const db = await getDB()
  if (!db) return
  await db.clear(store)
}

export async function exportAllAudit() {
  const [raw, llm, snapshot] = await Promise.all([
    getAllAudit("raw"),
    getAllAudit("llm"),
    getAllAudit("snapshot"),
  ])
  return { exportedAt: new Date().toISOString(), raw, llm, snapshot }
}
