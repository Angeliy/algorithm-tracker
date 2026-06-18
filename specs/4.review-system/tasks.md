# review-system — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-17 | v1   | 初始任务 |

## 项目信息

- 项目名: algorithm-tracker
- 架构类型: Turborepo monorepo
- specs 路径: specs/4.review-system/

## 任务列表

### 功能 1: DB Schema 扩展

- [x] T-001: 向 `problems` 表追加 `needs_review`、`marked_review_at`、`review_count`、`next_review_at`、`review_archived` 5列，运行 `pnpm db:push` ~15min

### 功能 2: 艾宾浩斯纯函数 + tRPC Router

- [x] T-002: 创建 `packages/api/src/lib/ebbinghaus.ts`，实现 `getNextReviewDate(markedAt, reviewCount)` 纯函数（`SCHEDULE = [1,3,7,15,30]`） ~15min
- [x] T-003: 创建 `packages/api/src/routers/review.ts`，实现 `markForReview`（含重置逻辑）、`completeReview`（含归档）、`getPending` 三个 procedure，注册到 `routers/index.ts` ~30min

### 功能 3: 前端

- [x] T-004: 在题目列表卡片和详情页添加"标记二刷"按钮，接入 `trpc.review.markForReview`，按 `needsReview/reviewArchived` 状态切换按钮文案与禁用态 ~15min
- [x] T-005: 创建 `apps/web/src/routes/_auth/review.tsx`：待复习列表 + 每条的"已复习"按钮（接入 `trpc.review.completeReview`），在 header 添加导航入口 ~30min

### 集成测试

- [x] T-006: 冒烟测试：标记→待复习页出现→点"已复习"5次→归档消失；重复标记→重置；`pnpm check-types` 无错误 ~15min

## 依赖关系

- T-001 依赖 `2.T-001`（problems 表已存在）
- T-002 无外部依赖
- T-003 依赖 T-001、T-002
- T-004 依赖 T-003（需要 `trpc.review.markForReview` 接口）
- T-005 依赖 T-003
- T-006 依赖 T-001 ~ T-005

## 风险点

- `pnpm db:push` 追加列时若列已存在会报错；先检查 schema 是否已有这些列
- 日期比较 `next_review_at ≤ today`：DB 中 date 类型与 JS Date 比较时需统一格式（`yyyy-MM-dd` 字符串比较）
- `date-fns` 已在 feature 3 中安装在 server，此 feature 直接使用无需重装
