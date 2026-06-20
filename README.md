# Algorithm Tracker

个人算法题目跟踪系统，支持题目记录、艾宾浩斯复习、模板管理、LeetCode 同步，以及 AI 辅助开发工作流监控。

## 功能模块

- **题目记录** — 记录刷题过程（题目、难度、标签、备注、是否 AC），支持按难度/标签/关键字筛选，服务端分页
- **艾宾浩斯复习** — 基于遗忘曲线自动安排复习节点（7 轮间隔），到期题目高亮提醒
- **模板管理** — 保存常用算法模板（代码片段 + 描述），按类型分组展示，支持关联题目
- **LeetCode 同步** — 定时（每天 9:00 CST）调用 LeetCode GraphQL API 同步 AC 题目，支持手动触发，记录同步日志
- **Dashboard** — 数据总览（总题数、AC 率、待复习数）+ 近期活动
- **工作流监控** — 实时展示 `/dean:ai` 开发工作流的节点状态（SSE + 轮询）
- **认证** — 邮箱注册/登录（Better Auth），受保护路由自动跳转

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite + React 19 + TanStack Router + TanStack Query + Tailwind CSS v4 |
| UI 组件 | shadcn/ui（`@algorithm-tracker/ui` 包，手动实现，shadcn CLI 在当前环境不可用）|
| 后端 | Hono + tRPC + Node.js |
| 认证 | Better Auth |
| 数据库 | Drizzle ORM + PostgreSQL |
| 定时任务 | node-cron（Asia/Shanghai 时区）|
| 实时通信 | Server-Sent Events（`hono/streaming`）|
| 构建 | Turborepo + pnpm workspace |
| 代码质量 | Biome（ultracite preset）+ Husky pre-commit |

## 目录结构

```
algorithm-tracker/
├── apps/
│   ├── web/          # Vite + React 前端（端口 5173）
│   │   └── src/routes/
│   │       ├── index.tsx           # 落地页（重定向到 /problems）
│   │       ├── login.tsx           # 登录/注册页
│   │       ├── workflow.tsx        # AI 工作流监控页
│   │       └── _auth/             # 受保护路由（需登录）
│   │           ├── dashboard.tsx
│   │           ├── problems/       # 题目列表 + 详情
│   │           ├── review.tsx      # 复习队列
│   │           └── templates/      # 模板列表 + 详情
│   └── server/       # Hono + tRPC 后端（端口 3000）
│       └── src/services/
│           └── workflow-status.ts  # workflow-status.json 读写
├── packages/
│   ├── api/          # tRPC routers（problem, template, review, stats, sync）
│   │   └── src/
│   │       ├── lib/ebbinghaus.ts   # 艾宾浩斯间隔计算
│   │       └── services/leetcode-sync.ts
│   ├── auth/         # Better Auth 配置
│   ├── db/           # Drizzle schema & migrations
│   ├── env/          # 环境变量校验（Zod）
│   ├── ui/           # shadcn/ui 共享组件（含 Pagination）
│   └── config/       # 共享 TS 配置
├── specs/            # /dean:ai 开发规格（7 个 feature，全部完成）
└── docs/             # 原始需求文档
```

## 快速开始

### 前置条件

- Node.js 18+
- pnpm
- PostgreSQL 数据库

### 安装

```bash
pnpm install
```

### 环境变量

在 `apps/server/` 下创建 `.env`：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/algorithm_tracker
BETTER_AUTH_SECRET=your-secret-32-chars-min
CORS_ORIGIN=http://localhost:5173
LEETCODE_SESSION=your-leetcode-session-cookie   # 可选，LeetCode 同步需要
SYNC_SECRET=your-sync-secret-32-chars-min       # 可选，手动触发同步鉴权
```

在 `apps/web/` 下创建 `.env`（或 `.env.local`）：

```env
VITE_SERVER_URL=http://localhost:3000
```

### 数据库初始化

```bash
# 开发阶段（直接 push schema，无需 migration 文件）
pnpm db:push

# 可选：写入初始种子数据
pnpm db:seed
```

### 启动开发服务器

```bash
pnpm dev          # 同时启动前端（5173）和后端（3000）
pnpm dev:web      # 仅前端
pnpm dev:server   # 仅后端
```

### 常用命令

```bash
pnpm build        # 构建全部
pnpm check        # Biome lint 检查
pnpm fix          # Biome 自动修复
pnpm db:studio    # 打开 Drizzle Studio 可视化数据库
pnpm db:generate  # 生成 migration 文件（生产用）
pnpm db:migrate   # 执行 migration（生产用）
```

## 关键设计决策

- **单用户设计**：`problems` / `templates` 表无 `userId` 外键，面向个人使用场景
- **服务端分页**：`problem.list`、`template.list`、`review.getPending` 均返回 `{ items, total, page, pageSize, totalPages }`，默认每页 20 条
- **shadcn CLI 不可用**：所有 UI 组件手动实现，使用 `@base-ui/react` render prop 模式
- **跨包类型隔离**：`WorkflowStatus` 类型在 `apps/server` 和 `apps/web` 中各自定义（monorepo 边界），不共享
- **Drizzle count() 类型**：`db.select({ total: count() })` 返回值第一个元素可能为 undefined，统一用 `countResult[0]?.total ?? 0` 处理

## AI 辅助开发工作流

本项目使用 `/dean:ai` 三阶段 AI 辅助开发流程。访问 `/workflow` 页面可实时查看开发进度（SSE + 2 秒轮询）。

所有 7 个 feature 已全部完成：
1. `auth-setup` — 认证（注册/登录/受保护路由）
2. `problem-records` — 题目 CRUD + 标签 + 筛选
3. `dashboard-workflow` — 数据统计 + 艾宾浩斯复习排期
4. `review-system` — 复习队列 + 完成复习操作
5. `templates-links` — 算法模板 + 题目关联链接
6. `leetcode-sync` — LeetCode 自动同步 + 手动触发
7. `workflow-monitor` — SSE 实时工作流状态面板
