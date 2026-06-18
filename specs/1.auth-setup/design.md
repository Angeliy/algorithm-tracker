# auth-setup — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: 环境变量、DB seed 脚本、API 清理、前端路由清理

## 功能模块设计

### 模块 1: 环境变量扩展

在 `packages/env/src/index.ts`（或 server.ts）中新增两个变量：

```typescript
// packages/env/src/server.ts（追加）
SEED_EMAIL: z.string().email(),
SEED_PASSWORD: z.string().min(8),
```

同时在 `apps/server/.env` 中添加示例值（实际值不提交）：

```env
SEED_EMAIL=admin@example.com
SEED_PASSWORD=your-secret-password
```

### 模块 2: Seed 脚本

路径：`apps/server/scripts/seed.ts`

```typescript
// 调用 Better Auth 内部 API 创建固定账号
import { auth } from "@algorithm-tracker/auth";
import { env } from "@algorithm-tracker/env/server";

async function seed() {
  try {
    await auth.api.signUpEmail({
      body: {
        email: env.SEED_EMAIL,
        password: env.SEED_PASSWORD,
        name: "Admin",
      },
    });
    console.log("Seeded:", env.SEED_EMAIL);
  } catch (e) {
    // Better Auth 在账号已存在时抛出错误，视为幂等成功
    if (String(e).includes("already exists") || String(e).includes("USER_ALREADY_EXISTS")) {
      console.log("Account already exists, skipping.");
    } else {
      throw e;
    }
  }
}

seed();
```

在 `apps/server/package.json` 中添加脚本：

```json
"seed": "tsx scripts/seed.ts"
```

在根 `package.json` 中添加：

```json
"seed": "turbo -F server seed"
```

### 模块 3: 清理 todo 残留

需删除的文件/代码：

| 文件 | 操作 |
|------|------|
| `packages/db/src/schema/todo.ts` | 删除文件 |
| `packages/db/src/schema/index.ts` | 移除 todo 导出 |
| `packages/api/src/routers/todo.ts` | 删除文件 |
| `packages/api/src/routers/index.ts` | 移除 `todo: todoRouter` |
| `apps/web/src/routes/todos.tsx` | 删除文件 |

`appRouter` 清理后只保留 `healthCheck` 和 `privateData`（后者在后续 feature 中也会被替换）。

### 模块 4: 前端登录流程确认

现有 `apps/web/src/routes/login.tsx` 和 `_auth/route.tsx` 已实现登录守卫，无需修改。

确认 `_auth/route.tsx` 未登录时重定向到 `/login`（检查现有逻辑是否已有 `redirect`）。

## 数据模型

无新增表。Better Auth 已自动管理 `user`、`session`、`account` 表。

## 安全考虑

- seed 脚本的凭据来自 env，不打印到日志（用 `env.SEED_EMAIL` 不 `process.env.SEED_EMAIL`，Zod 校验兜底）
- seed 脚本只在本地/CI 运行，不暴露为 API 端点

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| Seed 方式 | `auth.api.signUpEmail` 直接调用 | 密码由 Better Auth 正确 hash，无需手动操作 hash 算法 |
| 幂等处理 | catch 并判断错误消息 | Better Auth 无内置 upsert API，catch 是最简方案 |
