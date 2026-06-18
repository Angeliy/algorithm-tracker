# auth-setup — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始任务 |

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo
- specs 路径: specs/1.auth-setup/

## 任务列表

### 功能 1: 环境变量 + Seed 脚本

- [x] T-001: 在 `packages/env` server schema 中添加 `SEED_EMAIL`、`SEED_PASSWORD` 字段，并在 `apps/server/.env` 中添加示例值 ~15min
- [x] T-002: 创建 `apps/server/scripts/seed.ts`，调用 `auth.api.signUpEmail` 创建固定账号（幂等），在 `apps/server/package.json` 和根 `package.json` 中注册 `pnpm seed` 命令 ~15min

### 功能 2: 清理 todo 残留

- [x] T-003: 删除 `packages/db/src/schema/todo.ts`、`packages/api/src/routers/todo.ts`、`apps/web/src/routes/todos.tsx`，更新各 index 文件移除相关引用，确保 `pnpm check-types` 通过 ~15min

### 功能 3: 验证登录流程

- [x] T-004: 运行 `pnpm db:push && pnpm seed`，用种子账号完成登录/登出完整链路冒烟测试 ~15min

## 依赖关系

- T-002 依赖 T-001（需先有 env 变量）
- T-004 依赖 T-001、T-002、T-003

## 风险点

- `auth.api.signUpEmail` 内部调用是否需要 HTTP 上下文：若报错，改为直接 `fetch("http://localhost:3000/api/auth/sign-up/email", ...)` 并在脚本中先启动服务
- Better Auth 版本差异可能导致错误消息不同，幂等判断需根据实际错误调整
