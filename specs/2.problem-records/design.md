# problem-records — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: DB schema、tRPC API（packages/api）、前端路由（apps/web）

## 功能模块设计

### 模块 1: DB Schema

新增文件 `packages/db/src/schema/problem.ts`：

```typescript
import { pgEnum, pgTable, uuid, text, integer, boolean, date, timestamp, serial, unique } from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

export const problems = pgTable("problems", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  source: text("source"),
  difficulty: difficultyEnum("difficulty").notNull(),
  date: date("date").notNull(),
  timeSpent: integer("time_spent"),           // 分钟，整数
  isAc: boolean("is_ac").default(false).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const problemTags = pgTable("problem_tags", {
  id: serial("id").primaryKey(),
  problemId: uuid("problem_id")
    .references(() => problems.id, { onDelete: "cascade" })
    .notNull(),
  tag: text("tag").notNull(),
}, (t) => [unique().on(t.problemId, t.tag)]);
```

在 `packages/db/src/schema/index.ts` 中追加导出。

运行 `pnpm db:push` 应用 schema。

### 模块 2: tRPC Router

新建 `packages/api/src/routers/problem.ts`，注册到 `routers/index.ts`。

**接口设计：**

```typescript
// create
input: z.object({
  title: z.string().min(1),
  source: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  date: z.string(),            // ISO date "YYYY-MM-DD"
  timeSpent: z.number().int().positive().optional(),
  isAc: z.boolean().default(false),
  note: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

// update（同 create + id）
input: z.object({ id: z.string().uuid(), ...createShape })

// delete
input: z.object({ id: z.string().uuid() })

// list（带筛选）
input: z.object({
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  tag: z.string().optional(),
  isAc: z.boolean().optional(),
})

// getById
input: z.object({ id: z.string().uuid() })
```

标签写入：create/update 时，先 delete problemTags where problemId = id，再批量 insert 新标签（upsert 替代方案）。

所有 procedure 使用 `protectedProcedure`（来自 `packages/api/src/index.ts`）。

### 模块 3: 前端路由

新增路由文件（TanStack Router 文件式路由，文件名即路径）：

```
apps/web/src/routes/
  _auth/
    problems/
      index.tsx        → /_auth/problems     （列表页）
      new.tsx          → /_auth/problems/new （新增表单）
      $id.tsx          → /_auth/problems/$id  （详情页）
      $id.edit.tsx     → /_auth/problems/$id/edit （编辑表单）
```

**列表页 (`index.tsx`)**：
- `useQuery(trpc.problem.list.queryOptions({ difficulty, tag, isAc }))`
- 筛选 UI：难度 Select（shadcn）+ 标签 Input（free text）+ AC 状态 RadioGroup
- 卡片：标题、难度徽章（颜色区分）、标签列表、日期、AC 图标

**新增/编辑表单**：
- 复用同一 `ProblemForm` 组件（放在 `components/problem-form.tsx`）
- 标签输入：逗号分隔文本转数组，或使用 shadcn Badge + Enter 键添加
- 提交后跳转到列表页

**详情页 (`$id.tsx`)**：
- `useQuery(trpc.problem.getById.queryOptions({ id }))`
- 笔记区域：安装 `react-markdown`，`<ReactMarkdown>{note}</ReactMarkdown>`
- 右上角"编辑"按钮跳转 `$id.edit.tsx`，"删除"按钮带 confirm 对话框（shadcn AlertDialog）

## 数据模型

见模块 1。主表 `problems` + 关系表 `problem_tags`（级联删除）。

## 安全考虑

- 所有 tRPC procedure 使用 `protectedProcedure`（遵循 rules/backend-api.md）
- 单用户应用，无需 userId 过滤，但需验证已登录

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| 标签存储 | 独立 `problem_tags` 表 | 支持按标签筛选（JOIN），比 JSON array 列更易查询 |
| Markdown 渲染 | `react-markdown` | 轻量，无需编辑器，只读渲染 |
| 难度字段 | pgEnum | DB 层类型约束，避免非法值 |
| 标签同步 | 先全删再全插 | 简单可靠，标签数量少无性能问题 |
