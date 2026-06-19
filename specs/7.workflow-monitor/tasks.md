# workflow-monitor — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-19 | v1   | 初始任务 |

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo
- specs 路径: specs/7.workflow-monitor/

## 任务列表

### 功能 1: 状态文件 & 类型定义

- [x] T-001: 创建 `apps/server/src/services/workflow-status.ts`，定义 `WorkflowStatus` 类型和 `IDLE_STATUS` 常量；创建初始 `specs/workflow-status.json`（内容为 IDLE_STATUS JSON）~15min

### 功能 2: 后端 SSE Endpoint

- [x] T-002: 在 `apps/server/src/app.ts` 新增 `GET /api/workflow/stream` SSE 路由：连接时推送当前文件内容，`fs.watch` 监听变更持续推送，每 30s 发心跳，客户端断开时清理 ~30min

### 功能 3: 前端实时状态展示

- [x] T-003: 在 `apps/web/src/routes/workflow.tsx` 新增 `WorkflowStatusPanel` 组件（模块级），通过 `EventSource` 订阅 `${VITE_SERVER_URL}/api/workflow/stream`，维护 `WorkflowStatus` state ~30min
- [x] T-004: 实现 `StatusGrid` 子组件：展示 M1-M7 七个节点行，每行含状态徽章（待机灰/进行中蓝/已完成绿），当前节点额外显示 feature 进度和 task 进度；插入到现有 Mermaid 图下方 ~30min

### 功能 4: /dean:ai 技能更新

- [x] T-005: 修改 `.claude/commands/dean/ai.md`，在 M1-M7 每个节点说明末尾添加「状态写入」指令：进入节点时写 `in_progress`，节点完成时写 `completed`，M7 完成后额外写 IDLE_STATUS 重置 ~30min

## 依赖关系

- T-002 依赖 T-001（WorkflowStatus 类型）
- T-003 依赖 T-002（SSE endpoint 存在）
- T-004 依赖 T-003（StatusPanel 骨架）
- T-005 独立，可与 T-001 同步进行

## 风险点

- `hono/streaming` 的 `streamSSE` API：确认 Hono 版本（当前 `catalog:` 锁定）是否内建此模块；若无则改用手动设置响应头 `text/event-stream`
- `fs.watch` 在 macOS 上对已不存在文件的处理：建议 watch 父目录 `specs/` 并过滤文件名
- Biome `noExcessiveCognitiveComplexity`（max 20）：`WorkflowStatusPanel` + SSE 逻辑务必拆成 `WorkflowStatusPanel` 和 `StatusGrid` 两个模块级函数
- `/dean:ai` 技能写状态文件依赖 `Write` 工具且每次调用会触发 permission 提示；若 permission 模式设为 auto-approve 则顺畅，否则需用户在执行过程中手动确认多次
