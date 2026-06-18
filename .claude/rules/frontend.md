---
description: 前端规范：TanStack Router 路由、tRPC 客户端、shadcn/ui 组件
globs: apps/web/**
---

# 前端规范 (apps/web)

## 技术栈
- Vite + React 19 + TypeScript
- TanStack Router（文件式路由）+ TanStack Query
- Tailwind CSS v4
- shadcn/ui 组件来自 `@algorithm-tracker/ui`
- tRPC 客户端 + Better Auth 客户端

## 路由约定
- 路由文件放在 `apps/web/src/routes/`，TanStack Router 自动生成 `routeTree.gen.ts`（不手动编辑）
- 受保护的路由放在 `_auth/` 布局目录下（`_auth/route.tsx` 负责 session 校验）
- 路由文件命名：`kebab-case.tsx`

## 数据获取
- 通过 tRPC client 调用后端（`apps/web/src/utils/trpc.ts`），不直接 fetch API
- 使用 TanStack Query 管理缓存和 loading 状态
- 认证状态通过 Better Auth client（`apps/web/src/lib/auth-client.ts`）获取

## 组件
- UI 基础组件优先从 `@algorithm-tracker/ui` 引入（shadcn/ui 封装）
- 页面级组件放在对应路由文件中，可复用的提取到 `apps/web/src/components/`
- 不在组件内部定义子组件

## 样式
- 只使用 Tailwind 工具类，不写内联 style
- 动态类名通过 `cn()` 合并（来自 `@algorithm-tracker/ui`）
- 使用 Next Themes 实现主题切换（`ThemeProvider` 已在 root layout 挂载）
