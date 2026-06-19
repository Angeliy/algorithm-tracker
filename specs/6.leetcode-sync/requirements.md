# leetcode-sync — 需求规格

## 概述

每天定时拉取 LeetCode 最新提交记录，根据提交历史自动判断是否一次 AC，写入题目记录并可选标记错题本，消除手动录题的麻烦。

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo（Hono + tRPC 后端 / Vite + React 前端）

## 需求版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-19 | v1   | 初始需求 |

## 用户故事

- 作为用户，我想要每天自动同步 LeetCode 做题记录，以便不需要手动一条条录入
- 作为用户，我想要系统自动判断哪些题目需要二刷，以便不用自己逐条判断

## 功能需求

1. [F-001] 每天上午 9:00 自动触发同步任务（本地用 node-cron，生产环境由 AWS EventBridge Scheduler 发送 HTTP 请求触发）
2. [F-002] 通过 LeetCode 内部 GraphQL API 拉取账号最近的提交记录（需 `LEETCODE_SESSION` + `LEETCODE_CSRF_TOKEN` cookie 认证）
3. [F-003] 对每条 AC 题目，查询同题目的历史提交，判断是否存在早于 AC 的 Wrong Answer
4. [F-004] 一次 AC（无 WA 历史）→ 自动新增题目记录，`isAc: true`，`source: "LeetCode自动同步"`
5. [F-005] 多次提交才 AC（有 WA 历史）→ 新增题目记录，`isAc: true`，同时标记 `needsReview: true`（进入错题本）
6. [F-006] 题目已存在（同名 + 同日期）→ 跳过，不重复创建
7. [F-007] 每次同步结果写入 `sync_logs` 表（同步时间、新增数、跳过数、成功/失败状态）
8. [F-008] 前端看板页展示「同步状态卡片」：上次同步时间 + 新增题数；提供手动触发同步按钮
9. [F-009] 提供受 `SYNC_SECRET` 保护的内部 HTTP endpoint，供 AWS EventBridge 触发而无需 session 认证

## 非功能需求

- 性能：每次同步拉取最近 20 条 AC，逐题查一次历史提交；小数据量可接受串行
- 安全：LeetCode cookie 走 env var，不硬编码；内部 trigger endpoint 用 `SYNC_SECRET` header 保护
- 可靠性：LeetCode API 为非官方内部接口，可能随时失效；同步失败时写入 error 日志到 `sync_logs`，不崩 server

## 验收标准

- [ ] [AC-001] 配置 `.env` 后，`pnpm dev` 启动时控制台输出"Cron job registered: LeetCode sync at 09:00"
- [ ] [AC-002] 调用手动触发 tRPC endpoint，成功写入新题目记录（`source = "LeetCode自动同步"`）
- [ ] [AC-003] 同一题目第二次触发同步，验证记录未重复创建（返回 `skipped: 1`）
- [ ] [AC-004] 有 WA 历史的 AC 题目，写入记录时 `needsReview: true` 且 `nextReviewAt` 为明天
- [ ] [AC-005] 前端看板展示"上次同步"时间和新增数量，手动触发按钮可用
- [ ] [AC-006] `sync_logs` 表有对应同步记录行

## 依赖

- 2.problem-records（problems、problemTags 表、needsReview 写入逻辑）
- 4.review-system（markedReviewAt / nextReviewAt / reviewCount 字段约定）
- LeetCode 内部 GraphQL API（非官方，需 LEETCODE_SESSION cookie）
- node-cron 包
- AWS EventBridge Scheduler（生产环境，可选）

## 开放问题

- LeetCode GraphQL API 无官方文档，session cookie 约每 2 周过期一次，需用户手动刷新 `.env`
- LeetCode 对频繁 API 调用可能触发风控，每次同步控制在 20 题以内
