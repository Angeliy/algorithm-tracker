# leetcode-sync — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-19 | v1   | 初始任务 |

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo
- specs 路径: specs/6.leetcode-sync/

## 任务列表

### 功能 1: DB + Env 准备

- [x] T-001: 新增 `sync_logs` 表 schema（`packages/db/src/schema/sync-log.ts`），在 `schema/index.ts` 追加导出，执行 `pnpm db:push` ~15min
- [x] T-002: 在 `packages/env/src/server.ts` 新增 `LEETCODE_SESSION`、`LEETCODE_CSRF_TOKEN`、`LEETCODE_USERNAME`、`SYNC_SECRET` 四个 optional env var ~15min

### 功能 2: 同步 Service

- [x] T-003: 实现 `apps/server/src/services/leetcode-client.ts`：GraphQL 客户端，封装 `fetchRecentAC(username, limit)` 和 `fetchSubmissions(titleSlug)` 两个函数 ~30min
- [x] T-004: 实现 `apps/server/src/services/leetcode-sync.ts`：去重检测、WA 历史判断、problem + problemTag 写入、sync_log 写入的完整 `runSync(db)` 函数 ~30min

### 功能 3: 后端接入

- [x] T-005: 新增 `packages/api/src/routers/sync.ts`（`trigger` mutation + `lastLog` query），在 `routers/index.ts` 注册 `sync: syncRouter` ~30min
- [x] T-006: 在 `apps/server/src/index.ts` 添加 node-cron 定时任务（09:00）和 `POST /api/sync/run` 内部 endpoint（X-Sync-Secret 校验）~30min

### 功能 4: 前端展示

- [x] T-007: 在 `apps/web/src/routes/_auth/dashboard.tsx` 新增 LeetCode 同步状态卡片（lastLog 展示 + 手动触发按钮 + loading/toast 反馈）~30min

## 依赖关系

- T-003 依赖 T-002（env vars 读取）
- T-004 依赖 T-001（sync_logs 表）、T-003（leetcode-client）
- T-005 依赖 T-004（runSync）、T-001（syncLogs schema）
- T-006 依赖 T-004（runSync）、T-005（router 注册）
- T-007 依赖 T-005（tRPC endpoints）

跨 feature 依赖：T-004 复用 `2.problem-records` 的 problems/problemTags 表和 `4.review-system` 的 needsReview 字段约定。

## 风险点

- LeetCode 内部 GraphQL API 无官方支持，session cookie 约 2 周过期，用户需手动更新 `.env`；`fetchSubmissions` 可能因 slug 大小写不一致返回空，需加容错
- `node-cron` 为新依赖，需在 `apps/server/package.json` 添加（`pnpm add node-cron`），同时安装类型 `@types/node-cron`
- Biome `noExcessiveCognitiveComplexity`（max 20）：`runSync` 逻辑复杂，提前将"WA 检测"和"写入 DB"拆成独立函数
