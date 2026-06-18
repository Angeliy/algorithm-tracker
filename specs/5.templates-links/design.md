# templates-links — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: DB schema（新增2张表）、tRPC API、前端路由

## 功能模块设计

### 模块 1: DB Schema

新增文件 `packages/db/src/schema/template.ts`：

```typescript
export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),           // e.g. "动态规划"
  code: text("code").notNull(),
  description: text("description"),       // 适用场景说明
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const problemLinks = pgTable("problem_links", {
  id: serial("id").primaryKey(),
  problemAId: uuid("problem_a_id")
    .references(() => problems.id, { onDelete: "cascade" }).notNull(),
  problemBId: uuid("problem_b_id")
    .references(() => problems.id, { onDelete: "cascade" }).notNull(),
}, (t) => [unique().on(t.problemAId, t.problemBId)]);
// 约定：存储时始终保证 problemAId < problemBId（按字符串比较），避免重复对
```

更新 `packages/db/src/schema/index.ts` 导出。运行 `pnpm db:push`。

### 模块 2: 双向关联查询策略

`problemLinks` 只存一条记录（A < B），查询题目X的所有关联时：

```sql
WHERE problem_a_id = X OR problem_b_id = X
```

在 Drizzle 中：
```typescript
const links = await db.select().from(problemLinks)
  .where(or(eq(problemLinks.problemAId, id), eq(problemLinks.problemBId, id)));

const linkedIds = links.map((l) => l.problemAId === id ? l.problemBId : l.problemAId);
```

`add` 时确保 A < B 排序（字符串 uuid 比较）：
```typescript
const [a, b] = [problemAId, problemBId].sort();
await db.insert(problemLinks).values({ problemAId: a, problemBId: b })
  .onConflictDoNothing();
```

`remove` 时同样先排序再查询：
```typescript
const [a, b] = [problemAId, problemBId].sort();
await db.delete(problemLinks).where(
  and(eq(problemLinks.problemAId, a), eq(problemLinks.problemBId, b))
);
```

### 模块 3: tRPC Routers

**`template.ts`**（新建，注册到 `routers/index.ts`）：

```typescript
// list: 支持 type 过滤 + keyword 搜索（ilike description 或 type）
// create: input { type, code, description? }
// update: input { id, type, code, description? }
// delete: input { id }
```

**`problemLink.ts`**（新建，注册到 `routers/index.ts`）：

```typescript
// add: input { problemAId, problemBId }（内部排序确保 A < B）
// remove: input { problemAId, problemBId }
// getLinked: input { problemId } → 返回关联的完整 problem 列表（含标签）
```

### 模块 4: 前端

**`routes/_auth/templates/index.tsx`**（/templates 列表页）：
- `useQuery(trpc.template.list.queryOptions({ keyword }))`
- 按 `type` 分组：`Object.groupBy(data, t => t.type)`（或 lodash groupBy）
- 每组下展示代码块（`<pre><code>`）+ 适用场景
- 顶部搜索框（controlled，debounce 300ms 触发 refetch）
- 每条右上角"编辑"/"删除"按钮，触发 shadcn Dialog 内的表单

**关联功能（扩展 `routes/_auth/problems/$id.tsx`）**：
- 在详情页底部新增"关联题目"区域
- `useQuery(trpc.problemLink.getLinked.queryOptions({ problemId: id }))`
- 搜索框：输入关键词过滤现有题目（`trpc.problem.list` with 名称搜索）
- 搜索结果下拉列表，点击题目→调用 `trpc.problemLink.add`
- 已关联列表：显示标题+难度+标签，右侧"移除"按钮→调用 `trpc.problemLink.remove`

## 数据模型

`templates` 表 + `problem_links` 表（见模块 1）。

## 安全考虑

- 所有 template 和 problemLink 操作使用 `protectedProcedure`

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| 双向关联存储 | 单行 + A < B 排序约定 | 避免重复存储两条方向记录，查询时 OR 两个方向 |
| 代码高亮 | `<pre><code>` 纯文本（暂不引入 highlight.js） | MVP 阶段够用，避免增加包体 |
| 模板编辑 | shadcn Dialog 内联表单 | 不额外新增路由，操作轻量 |
| 题目搜索（关联添加时） | 复用 `trpc.problem.list` + 名称过滤 | 无需新增接口 |
