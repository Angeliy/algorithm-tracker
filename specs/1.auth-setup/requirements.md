# auth-setup — 需求规格

## 概述

配置固定账号登录：通过 seed 脚本创建唯一管理员账号，清理模板代码中的 todo 残留，验证完整登录/登出流程。

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo（apps/web + apps/server + packages/*）

## 需求版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始需求 |

## 用户故事

- 作为用户，我想要用固定邮箱+密码登录，以便不经过注册流程直接进入个人数据。

## 功能需求

1. [F-001] 凭据通过 `SEED_EMAIL` / `SEED_PASSWORD` 环境变量配置，不硬编码
2. [F-002] 提供 `scripts/seed.ts` 脚本，调用 Better Auth API 在 DB 中创建该账号（幂等：账号已存在则跳过）
3. [F-003] 删除项目模板残留的 `todo` 相关代码（schema、router、前端路由）
4. [F-004] 登录成功后跳转到 `/_auth/dashboard`，登出后跳转回 `/login`

## 非功能需求

- 安全: 密码由 Better Auth 内部 hash 存储，seed 脚本不输出明文密码到日志

## 验收标准

- [ ] [AC-001] 运行 `pnpm seed` 后，DB 中存在目标账号且可用该凭据登录
- [ ] [AC-002] 重复运行 `pnpm seed` 不报错、不创建重复账号
- [ ] [AC-003] 访问任意 `/_auth/*` 路由未登录时自动重定向到 `/login`
- [ ] [AC-004] 代码库中不存在任何 `todo` 相关的 schema / router / route 引用

## 依赖

- Better Auth（已集成）
- Drizzle + PostgreSQL（已集成）

## 开放问题

- 无
