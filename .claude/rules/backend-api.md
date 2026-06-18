---
description: 后端 API 规范：Hono 服务器、tRPC routers、鉴权约定
globs: apps/server/**, packages/api/**
---

# 后端 API 规范

## 技术栈
- Hono（HTTP 框架）+ Node.js runtime
- tRPC（类型安全 RPC）
- Better Auth（认证，挂载在 `/api/auth/*`）

## 文件职责
| 路径 | 职责 |
|------|------|
| `apps/server/src/index.ts` | Hono 服务器入口，挂载中间件和路由 |
| `packages/api/src/routers/` | tRPC router 文件，每个业务域一个文件 |
| `packages/api/src/context.ts` | tRPC context 创建（注入 session、db） |
| `packages/api/src/index.ts` | 导出 `publicProcedure`、`protectedProcedure`、`router` |

## tRPC 规范
- 需要登录的操作必须用 `protectedProcedure`，公开操作用 `publicProcedure`
- 新增业务模块在 `packages/api/src/routers/` 下新建文件，并在 `routers/index.ts` 中合并到 `appRouter`
- 所有输入用 Zod schema 校验（`input(z.object({...}))`）

## 错误处理
- 抛出 `TRPCError` 而不是普通 Error：`throw new TRPCError({ code: 'NOT_FOUND', message: '...' })`
- 常用 code：`UNAUTHORIZED`、`NOT_FOUND`、`BAD_REQUEST`、`INTERNAL_SERVER_ERROR`

## 服务器约定
- 开发端口：`3000`
- CORS origin 通过 `env.CORS_ORIGIN` 控制，不硬编码
- 日志使用 Hono 内置 `logger()` 中间件，不用 `console.log`
