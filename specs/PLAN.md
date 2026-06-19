# 开发计划索引

## 本次 PRD（2026-06-17）切分为 5 个 feature

| 序号 | feature              | 说明                                       | 依赖 | 状态   |
| ---- | -------------------- | ------------------------------------------ | ---- | ------ |
| 1    | auth-setup           | 固定账号 seed、清理 todo 残留、验证登录流程 | -    | 待开发 |
| 2    | problem-records      | 题目 CRUD、标签/难度/AC 筛选、详情页        | 1    | 待开发 |
| 3    | dashboard-workflow   | 统计看板、30天趋势图、连续打卡、/workflow 页 | 2    | 待开发 |
| 4    | review-system        | 错题本标记、艾宾浩斯5次复习、待复习列表     | 2    | 待开发 |
| 5    | templates-links      | 算法模板库 CRUD、题目关联（双向多对多）     | 2    | 待开发 |

| 6    | leetcode-sync        | LeetCode 定时同步、WA 判断、auto-create 题目、sync_log | 2,4  | 已完成 |
| 7    | workflow-monitor     | /workflow 页实时监控 M1-M7 节点状态（SSE + 文件写入）  | 3    | 待开发 |

**推荐执行顺序**：1 → 2 → 3 / 4 / 5（3、4、5 均依赖 2，互相独立可并行）→ 6（依赖 2 + 4）→ 7（依赖 3）

## ID 编号约定

- 功能需求 / 任务 / 验收标准 ID **在单个 feature 内编号**，跨 feature 引用加 `{序号}.` 前缀。
- 例：`2.T-003` = feature 2 的 T-003；`4.F-002` = feature 4 的 F-002。
- **跨 feature 依赖**写全限定 ID，如 `3.T-001 依赖 2.T-001`。
