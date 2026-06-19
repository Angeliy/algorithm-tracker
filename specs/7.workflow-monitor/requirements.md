# workflow-monitor — 需求规格

## 概述

将 `/workflow` 页面从静态 Mermaid 流程图升级为实时监控面板，能即时看到 `/dean:ai` 当前执行到哪个节点/feature/task，无需盯着 Claude Code 对话框。

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo（Hono + tRPC 后端 / Vite + React 前端）

## 需求版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-19 | v1   | 初始需求 |

## 用户故事

- 作为用户，我想要打开 `/workflow` 页面就能看到 `/dean:ai` 当前的实时执行状态，以便不用一直盯着 Claude Code 对话框

## 功能需求

1. [F-001] `/dean:ai` 技能文件每次进入或完成 M1-M7 任一节点时，使用 Write 工具将当前状态写入 `specs/workflow-status.json`，记录：当前节点代码（M1-M7）、节点标签、当前 feature 序号与名称、当前 task ID 与标题、状态（idle / in_progress / completed）、更新时间
2. [F-002] 后端新增 `GET /api/workflow/stream` SSE 接口：客户端连接时立即推送当前状态，`fs.watch` 检测 `specs/workflow-status.json` 变化后再次推送；文件不存在时推送 `{ status: "idle" }`
3. [F-003] `/workflow` 前端页面保留现有静态 Mermaid 流程图，在图下方新增「实时执行状态」区块，通过 `EventSource` 订阅 SSE 接口
4. [F-004] 状态区块展示 M1-M7 七个节点，每个节点显示：名称（如「M3 执行 Task」）+ 状态徽章（待机 / 进行中 / 已完成）；当前节点同时显示 feature 进度和 task 进度
5. [F-005] `/dean:ai` 技能执行完 M7（全部完成）后，将状态文件重置为 `{ status: "idle", updatedAt: ... }`

## 非功能需求

- 性能：SSE 仅用于本地开发，无需考虑 AWS Lambda 部署兼容（Lambda 有超时限制，SSE 不适合）
- 可靠性：文件不存在/读取失败时 SSE 推送 `{ status: "idle" }` 而不崩溃
- 安全：SSE 接口无需认证（`/workflow` 页面本身无认证保护，与现有路由一致）

## 验收标准

- [ ] [AC-001] 运行 `/dean:ai` 时，`specs/workflow-status.json` 在每个 M 节点开始/完成时被写入
- [ ] [AC-002] 访问 `GET /api/workflow/stream` 能收到 SSE 流，格式 `data: {...}\n\n`
- [ ] [AC-003] 打开浏览器 `/workflow` 页面，状态区块可见；手动修改 workflow-status.json 后页面在 1 秒内自动刷新状态
- [ ] [AC-004] `/dean:ai` 空闲时 `/workflow` 页面显示「待机」，运行中显示「进行中」+当前节点/feature/task

## 依赖

- Feature 3（3.dashboard-workflow）：`/workflow` 页面已存在，本次为升级
- Node.js `fs.watch` API（内建，无需新依赖）
- Hono SSE helpers（`hono/streaming` 内建，无需新依赖）

## 开放问题

- SSE 在 AWS 生产环境（Lambda + Function URL）下连接时间有限制（约 15 秒），该功能设计为仅在本地开发使用，不作为生产功能
