---
description: 数据库规范：Drizzle ORM、PostgreSQL schema、migration 流程
globs: packages/db/**
---

# 数据库规范 (packages/db)

## 技术栈
- Drizzle ORM + PostgreSQL（`pg` driver）
- `drizzle-kit` 管理 schema 和 migration

## 文件结构
```
packages/db/src/
├── index.ts          # 导出 db 实例（createDb()）
├── schema/
│   ├── index.ts      # 汇总所有 schema 导出
│   ├── auth.ts       # Better Auth 相关表
│   └── todo.ts       # 业务表示例
└── migrations/       # 自动生成的 SQL migration 文件
```

## Schema 约定
- 每个业务域一个 schema 文件，在 `schema/index.ts` 中统一导出
- 表名使用 `snake_case`（Drizzle 默认）
- 主键用 `uuid` 或 `serial`，`createdAt` / `updatedAt` 用 `timestamp`

## Migration 流程
```bash
# 开发阶段（直接推送 schema，跳过 migration 文件）
pnpm db:push

# 生产/正式流程
pnpm db:generate   # 根据 schema 变更生成 migration SQL
pnpm db:migrate    # 执行 migration

# 可视化查看数据
pnpm db:studio
```

## 使用规范
- 业务逻辑中通过 `import { db } from '@algorithm-tracker/db'` 获取 db 实例
- 不在 tRPC context 之外直接实例化 db；context 已注入 db
- DATABASE_URL 从 `apps/server/.env` 读取，不硬编码
