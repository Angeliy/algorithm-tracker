# leetcode-sync — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-19 | v1   | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: DB schema、env 配置、后端 service、tRPC router、Hono 中间件/endpoint、前端组件

---

## 功能模块设计

### 模块 1: DB — sync_logs 表

**文件**: `packages/db/src/schema/sync-log.ts`

```ts
export const syncStatusEnum = pgEnum("sync_status", ["success", "error"]);

export const syncLogs = pgTable("sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  newProblems: integer("new_problems").default(0).notNull(),
  skippedProblems: integer("skipped_problems").default(0).notNull(),
  status: syncStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
});
```

在 `packages/db/src/schema/index.ts` 中追加导出。执行 `pnpm db:push`。

---

### 模块 2: env — 新增 LeetCode 相关变量

**文件**: `packages/env/src/server.ts`

新增字段：

```ts
LEETCODE_SESSION: z.string().optional(),
LEETCODE_CSRF_TOKEN: z.string().optional(),
LEETCODE_USERNAME: z.string().optional(),
SYNC_SECRET: z.string().optional(),
```

全部 `optional()`——未配置时 cron 任务 skip，不影响其他功能启动。

---

### 模块 3: LeetCode GraphQL 客户端

**文件**: `apps/server/src/services/leetcode-client.ts`

**认证**: 每次请求携带 Cookie header：
```
Cookie: LEETCODE_SESSION=xxx; csrftoken=yyy
X-CSRFToken: yyy
Content-Type: application/json
```

**Query 1 — 拉取最近 AC 列表**（limit=20）：
```graphql
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}
```
返回字段：`id`（提交 ID）、`title`（题目名）、`titleSlug`（slug）、`timestamp`（Unix 秒）。

**Query 2 — 查询指定题目的提交历史**（检测是否有 WA）：
```graphql
query submissionList($questionSlug: String!, $offset: Int!, $limit: Int!) {
  submissionList(offset: $offset, limit: $limit, questionSlug: $questionSlug) {
    submissions {
      id
      statusDisplay
      timestamp
    }
  }
}
```
取前 10 条，检查是否存在 `statusDisplay === "Wrong Answer"` 且 timestamp 早于 AC 提交。

**错误处理**: 网络错误 / HTTP 非 200 / GraphQL errors 字段存在 → 抛出带描述的 `Error`，由上层捕获写入 `sync_logs`。

---

### 模块 4: 同步 Service

**文件**: `apps/server/src/services/leetcode-sync.ts`

**核心逻辑（伪代码）**：

```
async function runSync(db):
  acList = await leetcodeClient.fetchRecentAC(username, 20)

  newProblems = 0
  skippedProblems = 0

  for each ac in acList:
    date = toLocalDateString(ac.timestamp)   // "YYYY-MM-DD"

    // 去重：title + date 相同 → skip
    existing = db.select from problems where title=ac.title AND date=date
    if existing:
      skippedProblems++
      continue

    // 查 WA 历史
    submissions = await leetcodeClient.fetchSubmissions(ac.titleSlug)
    acTimestamp = ac.timestamp
    hasWA = submissions.some(s => s.statusDisplay === "Wrong Answer" && s.timestamp < acTimestamp)

    // 写入 problems
    problemId = uuid()
    db.insert problems { id, title, source:"LeetCode自动同步", difficulty:"medium",
                         date, isAc:true, needsReview:hasWA,
                         markedReviewAt: hasWA ? date : null,
                         nextReviewAt: hasWA ? nextDay(date) : null,
                         reviewCount: 0, reviewArchived: false }

    // 写入 problemTags（"LeetCode" 作为默认 tag）
    db.insert problemTags { problemId, tag:"LeetCode" }

    newProblems++

  // 写 sync_log
  db.insert syncLogs { syncedAt:now, newProblems, skippedProblems, status:"success" }
  return { newProblems, skippedProblems }
```

**说明**：
- `difficulty` 默认填 `"medium"`（LeetCode API 也会返回 difficulty，若 GraphQL 响应含此字段则优先使用）
- `toLocalDateString` 将 Unix 时间戳转为本地 `YYYY-MM-DD`，避免 UTC 偏移问题（参考 LESSONS.md）
- `nextDay(date)` = `parseISO(date)` + 1 天，使用 `date-fns`

---

### 模块 5: tRPC Router — sync

**文件**: `packages/api/src/routers/sync.ts`

```ts
export const syncRouter = router({
  // 手动触发（需登录）
  trigger: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await runSync(ctx.db);
    return result;  // { newProblems, skippedProblems }
  }),

  // 获取最近一次同步日志（需登录）
  lastLog: protectedProcedure.query(async ({ ctx }) => {
    const [log] = await ctx.db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.syncedAt))
      .limit(1);
    return log ?? null;
  }),
});
```

在 `packages/api/src/routers/index.ts` 中追加 `sync: syncRouter`。

---

### 模块 6: Hono 内部 trigger endpoint + node-cron

**文件**: `apps/server/src/index.ts`（修改）

**内部 HTTP endpoint**（供 EventBridge 调用）：
```
POST /api/sync/run
Header: X-Sync-Secret: <SYNC_SECRET>
```
- 校验 header 与 env `SYNC_SECRET` 匹配
- 调用 `runSync(db)` 并返回 JSON 结果
- 不校验 Better Auth session，仅凭 SYNC_SECRET

**node-cron 注册**（server 启动时）：
```ts
import cron from "node-cron";

if (env.LEETCODE_SESSION && env.LEETCODE_USERNAME) {
  cron.schedule("0 9 * * *", async () => {
    await runSync(db);
  });
  console.log("Cron job registered: LeetCode sync at 09:00");
}
```

**AWS 生产环境**：EventBridge Scheduler → Lambda Function URL（即现有 Hono Lambda）→ `POST /api/sync/run`（携带 `X-Sync-Secret`），无需单独的 Lambda。

---

### 模块 7: 前端 — 同步状态卡片

**文件**: `apps/web/src/routes/_auth/dashboard.tsx`（修改）

在看板顶部已有统计卡片区域，新增「LeetCode 同步」卡片：

```
┌─────────────────────────────┐
│  🔄 LeetCode 同步            │
│  上次同步: 今天 09:00         │
│  新增: 3 题  跳过: 0 题       │
│  [手动同步]  ← 按钮          │
└─────────────────────────────┘
```

- 用 `trpc.sync.lastLog.useQuery()` 展示上次同步信息
- 用 `trpc.sync.trigger.useMutation()` 绑定手动触发按钮
- 未配置 LeetCode 账号（lastLog 为 null）时卡片显示"未配置 LeetCode 账号"灰色提示
- 触发中显示 loading 状态，完成后 toast 提示"同步完成，新增 N 题"
- 使用 `useQueryClient().invalidateQueries([["sync", "lastLog"]])` 更新状态

---

## 接口契约

| 接口 | 类型 | 认证 | 描述 |
|---|---|---|---|
| `trpc.sync.trigger` | mutation | session | 手动触发同步 |
| `trpc.sync.lastLog` | query | session | 获取最近同步日志 |
| `POST /api/sync/run` | HTTP | X-Sync-Secret | EventBridge 触发入口 |

---

## 数据模型

**新增表**: `sync_logs`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| synced_at | timestamp | 同步时间 |
| new_problems | int | 本次新增题数 |
| skipped_problems | int | 本次跳过题数 |
| status | enum(success/error) | 同步结果 |
| error_message | text nullable | 失败原因 |

**复用已有字段**（problems 表无需新增列）：
- `source` = `"LeetCode自动同步"` 区分来源
- `needsReview`, `markedReviewAt`, `nextReviewAt`, `reviewCount` 沿用错题本逻辑

---

## 安全考虑

- `LEETCODE_SESSION` / `LEETCODE_CSRF_TOKEN` 存 `.env`，不进 git
- `/api/sync/run` 必须校验 `X-Sync-Secret`，为空时返回 403
- LeetCode cookie 过期后 API 返回 401/empty，sync_log 记录 error，不影响其他功能

---

## 技术决策

| 决策 | 选项 | 理由 |
|---|---|---|
| 判断逻辑 | 确定性规则（WA历史检测）| 无需 API key，延迟低，逻辑透明 |
| 去重方式 | title + date 组合唯一 | 足够精确，无需新增唯一约束（小数据量） |
| AWS 触发 | EventBridge → 现有 Hono Lambda HTTP endpoint | 无需额外 Lambda 函数，省成本 |
| LeetCode difficulty | 默认 medium，API 有返回则覆盖 | LeetCode GraphQL 确实返回 difficulty 字段 |
