# review-system — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: DB schema（扩展 problems 表）、tRPC API、前端路由

## 功能模块设计

### 模块 1: DB Schema 扩展

在 `packages/db/src/schema/problem.ts` 的 `problems` 表中追加4列：

```typescript
// 追加到 problems 表定义
needsReview: boolean("needs_review").default(false).notNull(),
markedReviewAt: date("marked_review_at"),     // 标记日期，用于推算曲线
reviewCount: integer("review_count").default(0).notNull(),   // 已完成复习次数 (0-5)
nextReviewAt: date("next_review_at"),          // 下次应复习日期
reviewArchived: boolean("review_archived").default(false).notNull(),
```

运行 `pnpm db:push` 追加列（开发阶段直接 push，列有默认值不影响现有数据）。

### 模块 2: 艾宾浩斯日期计算逻辑

纯函数，放在 `packages/api/src/lib/ebbinghaus.ts`：

```typescript
const SCHEDULE = [1, 3, 7, 15, 30] as const;  // 距标记日的天数

export function getReviewDates(markedAt: Date): string[] {
  return SCHEDULE.map((n) => format(addDays(markedAt, n), "yyyy-MM-dd"));
}

export function getNextReviewDate(markedAt: Date, reviewCount: number): string | null {
  if (reviewCount >= SCHEDULE.length) return null;  // 已归档
  return format(addDays(markedAt, SCHEDULE[reviewCount]), "yyyy-MM-dd");
}
```

### 模块 3: tRPC Router

新建 `packages/api/src/routers/review.ts`，注册到 `routers/index.ts`。

**`review.markForReview(problemId)`**（protectedProcedure）：
- 查询题目当前状态
- 若 `needsReview=true && !reviewArchived`：返回提示"已在复习队列"（TRPCError BAD_REQUEST）
- 若 `reviewArchived=true`：重置（review_count=0, archived=false）并重新计算
- 其他情况：设置 `needs_review=true, marked_review_at=today, review_count=0, next_review_at=today+1day`

**`review.completeReview(problemId)`**（protectedProcedure）：
```typescript
const newCount = problem.reviewCount + 1;
if (newCount >= 5) {
  // 归档
  await db.update(problems).set({ reviewCount: newCount, reviewArchived: true, nextReviewAt: null })
} else {
  const nextDate = getNextReviewDate(new Date(problem.markedReviewAt!), newCount);
  await db.update(problems).set({ reviewCount: newCount, nextReviewAt: nextDate })
}
```

**`review.getPending()`**（protectedProcedure）：
```typescript
where(and(
  eq(problems.needsReview, true),
  eq(problems.reviewArchived, false),
  lte(problems.nextReviewAt, format(new Date(), "yyyy-MM-dd")),
))
```

### 模块 4: 前端

**`routes/_auth/review.tsx`（错题本页）**：
- `useQuery(trpc.review.getPending.queryOptions())`
- 每条展示：标题、难度徽章、标签、"第N次复习（N/5）"、到期日
- "已复习"按钮 → `useMutation(trpc.review.completeReview.mutationOptions(...))`，成功后刷新列表

**`components/problem-form.tsx` / 题目列表卡片**（扩展）：
- 添加"标记二刷"按钮（Bookmark 图标），调用 `trpc.review.markForReview`
- 若 `needsReview=true && !reviewArchived`，按钮变为禁用态并显示"复习中"
- 若 `reviewArchived=true`，按钮显示"重新二刷"

**详情页 `$id.tsx`（扩展）**：
- 显示复习状态：进度条（review_count/5）或"已归档"徽章

## 数据模型

在 `problems` 表追加字段（见模块 1），无新增表。

## 安全考虑

- 所有 review 操作使用 `protectedProcedure`

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| 曲线存储 | 存 `marked_review_at` + `review_count` 推算 | 无需存储5个日期，逻辑简洁 |
| 计算位置 | 服务端纯函数 | 日期计算不依赖客户端时区 |
| 重置逻辑 | 归档后重新标记可重置 | 满足 F-007，用户可反复练习 |
