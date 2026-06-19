import "dotenv/config";
import { db, problems, problemTags, templates } from "@algorithm-tracker/db";
import { addDays, format, subDays } from "date-fns";

const today = new Date();
const d = (offset: number) => format(subDays(today, offset), "yyyy-MM-dd");
const nextReview = (markedAt: string) =>
	format(addDays(new Date(markedAt), 1), "yyyy-MM-dd");

// ── 题目数据 ──────────────────────────────────────────────────────────────
const PROBLEMS: {
	title: string;
	source: string;
	difficulty: "easy" | "medium" | "hard";
	date: string;
	timeSpent: number;
	isAc: boolean;
	note: string;
	tags: string[];
	needsReview?: boolean;
}[] = [
	{
		title: "两数之和",
		source: "LeetCode 1",
		difficulty: "easy",
		date: d(13),
		timeSpent: 12,
		isAc: true,
		note: "哈希表记录已见过的数，O(n) 一次遍历。",
		tags: ["数组", "哈希表"],
	},
	{
		title: "无重复字符的最长子串",
		source: "LeetCode 3",
		difficulty: "medium",
		date: d(12),
		timeSpent: 25,
		isAc: true,
		note: "滑动窗口，用 Set 维护窗口内字符，右指针扩张左指针收缩。",
		tags: ["滑动窗口", "哈希表"],
	},
	{
		title: "寻找两个正序数组的中位数",
		source: "LeetCode 4",
		difficulty: "hard",
		date: d(12),
		timeSpent: 55,
		isAc: false,
		note: "二分在较短数组上找分割点，保证左半部分总元素数 = (m+n+1)/2。",
		tags: ["二分查找", "数组"],
		needsReview: true,
	},
	{
		title: "合并两个有序链表",
		source: "LeetCode 21",
		difficulty: "easy",
		date: d(11),
		timeSpent: 10,
		isAc: true,
		note: "迭代双指针逐一比较，用 dummy head 简化边界处理。",
		tags: ["链表", "双指针"],
	},
	{
		title: "最大子数组和",
		source: "LeetCode 53",
		difficulty: "medium",
		date: d(10),
		timeSpent: 20,
		isAc: true,
		note: "Kadane 算法：dp[i] = max(nums[i], dp[i-1] + nums[i])。",
		tags: ["动态规划", "数组"],
	},
	{
		title: "跳跃游戏",
		source: "LeetCode 55",
		difficulty: "medium",
		date: d(10),
		timeSpent: 18,
		isAc: true,
		note: "贪心，维护当前能到达的最远位置 maxReach，遍历时更新。",
		tags: ["贪心", "数组"],
	},
	{
		title: "最长公共子序列",
		source: "LeetCode 1143",
		difficulty: "medium",
		date: d(9),
		timeSpent: 35,
		isAc: true,
		note: "二维 DP，dp[i][j] = 前 i 个和前 j 个字符的 LCS 长度。",
		tags: ["动态规划"],
		needsReview: true,
	},
	{
		title: "二叉树的层序遍历",
		source: "LeetCode 102",
		difficulty: "medium",
		date: d(8),
		timeSpent: 22,
		isAc: true,
		note: "BFS 队列，每层开始时记录队列长度，循环该长度次后换层。",
		tags: ["BFS", "二叉树"],
	},
	{
		title: "岛屿数量",
		source: "LeetCode 200",
		difficulty: "medium",
		date: d(7),
		timeSpent: 20,
		isAc: true,
		note: "DFS 遍历每个格子，遇到 '1' 就 DFS 标记整块岛屿为已访问。",
		tags: ["DFS", "BFS", "数组"],
	},
	{
		title: "搜索旋转排序数组",
		source: "LeetCode 33",
		difficulty: "medium",
		date: d(6),
		timeSpent: 30,
		isAc: true,
		note: "二分判断 mid 落在哪半段有序区间，再决定向哪边收缩。",
		tags: ["二分查找", "数组"],
		needsReview: true,
	},
	{
		title: "接雨水",
		source: "LeetCode 42",
		difficulty: "hard",
		date: d(5),
		timeSpent: 45,
		isAc: false,
		note: "双指针从两端向中间，每次移动 height 较小的一侧，用 leftMax/rightMax 计算积水。",
		tags: ["双指针", "数组"],
		needsReview: true,
	},
	{
		title: "爬楼梯",
		source: "LeetCode 70",
		difficulty: "easy",
		date: d(4),
		timeSpent: 8,
		isAc: true,
		note: "斐波那契变形，dp[i] = dp[i-1] + dp[i-2]，滚动变量优化空间。",
		tags: ["动态规划"],
	},
	{
		title: "全排列",
		source: "LeetCode 46",
		difficulty: "medium",
		date: d(3),
		timeSpent: 28,
		isAc: true,
		note: "回溯，used 数组标记已选，递归到底时收集结果。",
		tags: ["DFS", "回溯"],
	},
	{
		title: "单词搜索",
		source: "LeetCode 79",
		difficulty: "medium",
		date: d(2),
		timeSpent: 35,
		isAc: true,
		note: "DFS + 回溯，四方向探索，visited 用 XOR 原地标记避免额外空间。",
		tags: ["DFS", "回溯", "数组"],
	},
	{
		title: "最小路径和",
		source: "LeetCode 64",
		difficulty: "medium",
		date: d(1),
		timeSpent: 22,
		isAc: true,
		note: "DP 原地修改，grid[i][j] += min(grid[i-1][j], grid[i][j-1])。",
		tags: ["动态规划", "数组"],
	},
];

// ── 模板数据 ──────────────────────────────────────────────────────────────
const TEMPLATES: { type: string; code: string; description: string }[] = [
	{
		type: "双指针",
		description:
			"适用于有序数组求和、回文判断、去重等需要从两端向中间收缩的问题",
		code: `function twoPointers(arr: number[], target: number): [number, number] | null {
  let left = 0;
  let right = arr.length - 1;
  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return null;
}`,
	},
	{
		type: "滑动窗口",
		description: "适用于子数组/子字符串的最值问题，窗口右扩左缩维护约束条件",
		code: `function slidingWindow(s: string, k: number): number {
  let left = 0;
  let max = 0;
  const freq = new Map<string, number>();

  for (let right = 0; right < s.length; right++) {
    freq.set(s[right], (freq.get(s[right]) ?? 0) + 1);
    // 窗口不满足条件时收缩左边
    while (freq.size > k) {
      const c = s[left++];
      freq.set(c, freq.get(c)! - 1);
      if (freq.get(c) === 0) freq.delete(c);
    }
    max = Math.max(max, right - left + 1);
  }
  return max;
}`,
	},
	{
		type: "二分查找",
		description:
			"适用于有序数组查找目标值或满足条件的边界，时间复杂度 O(log n)",
		code: `function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1; // 未找到
}

// 查找左边界（第一个 >= target 的位置）
function lowerBound(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length;
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] < target) left = mid + 1;
    else right = mid;
  }
  return left;
}`,
	},
	{
		type: "动态规划",
		description:
			"适用于最优子结构问题，明确状态定义、转移方程、初始值和遍历顺序",
		code: `// 一维 DP 模板（以最长递增子序列为例）
function lis(nums: number[]): number {
  const n = nums.length;
  const dp = new Array(n).fill(1); // dp[i]: 以 nums[i] 结尾的最长子序列长度
  let ans = 1;
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
    ans = Math.max(ans, dp[i]);
  }
  return ans;
}

// 二维 DP 模板（以最长公共子序列为例）
function lcs(s1: string, s2: string): number {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}`,
	},
	{
		type: "DFS（深度优先搜索）",
		description: "适用于树/图的遍历、连通分量、路径搜索、回溯枚举等问题",
		code: `// 图的 DFS（以岛屿数量为例）
function dfs(grid: string[][], r: number, c: number): void {
  const rows = grid.length, cols = grid[0].length;
  if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
  grid[r][c] = '0'; // 标记已访问
  dfs(grid, r + 1, c);
  dfs(grid, r - 1, c);
  dfs(grid, r, c + 1);
  dfs(grid, r, c - 1);
}

// 回溯模板（全排列）
function backtrack(
  nums: number[],
  used: boolean[],
  path: number[],
  result: number[][]
): void {
  if (path.length === nums.length) {
    result.push([...path]);
    return;
  }
  for (let i = 0; i < nums.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    path.push(nums[i]);
    backtrack(nums, used, path, result);
    path.pop();
    used[i] = false;
  }
}`,
	},
	{
		type: "BFS（广度优先搜索）",
		description: "适用于最短路径、层序遍历、最小步数等需要按层扩展的问题",
		code: `// BFS 模板（以层序遍历/最短路径为例）
function bfs(grid: number[][], start: [number, number]): number {
  const rows = grid.length, cols = grid[0].length;
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const queue: [number, number, number][] = [[start[0], start[1], 0]];
  visited[start[0]][start[1]] = true;

  while (queue.length > 0) {
    const [r, c, dist] = queue.shift()!;
    if (r === rows - 1 && c === cols - 1) return dist; // 到达终点
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
          && !visited[nr][nc] && grid[nr][nc] === 0) {
        visited[nr][nc] = true;
        queue.push([nr, nc, dist + 1]);
      }
    }
  }
  return -1;
}`,
	},
	{
		type: "单调栈",
		description:
			"适用于下一个更大/更小元素、直方图面积等需要维护递增/递减序列的问题",
		code: `// 单调递减栈：求每个元素右边第一个更大的值
function nextGreater(nums: number[]): number[] {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack: number[] = []; // 存下标

  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && nums[stack[stack.length - 1]] < nums[i]) {
      result[stack.pop()!] = nums[i];
    }
    stack.push(i);
  }
  return result;
}`,
	},
	{
		type: "前缀和",
		description: "适用于子数组求和、区间查询，O(1) 回答区间和查询",
		code: `// 一维前缀和
function buildPrefix(nums: number[]): number[] {
  const prefix = new Array(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
  }
  return prefix;
}
// 查询 [left, right] 区间和（闭区间）
function rangeSum(prefix: number[], left: number, right: number): number {
  return prefix[right + 1] - prefix[left];
}`,
	},
];

async function seedData() {
	console.log("🌱 开始插入测试数据...\n");

	// ── 清空旧测试数据（可选，注释掉则追加） ─────────────────────────────
	// await db.delete(templates);
	// await db.delete(problems); // cascade 会自动删 tags 和 links

	// ── 插入题目 ──────────────────────────────────────────────────────────
	console.log("📝 插入题目记录...");
	for (const p of PROBLEMS) {
		const markedAt = p.needsReview ? p.date : null;
		const [inserted] = await db
			.insert(problems)
			.values({
				title: p.title,
				source: p.source,
				difficulty: p.difficulty,
				date: p.date,
				timeSpent: p.timeSpent,
				isAc: p.isAc,
				note: p.note,
				needsReview: p.needsReview ?? false,
				markedReviewAt: markedAt,
				reviewCount: 0,
				nextReviewAt: markedAt ? nextReview(markedAt) : null,
				reviewArchived: false,
			})
			.returning();

		if (inserted && p.tags.length > 0) {
			await db
				.insert(problemTags)
				.values(p.tags.map((tag) => ({ problemId: inserted.id, tag })));
		}

		console.log(
			`  ✓ ${p.title} [${p.difficulty}]${p.needsReview ? " 📌二刷" : ""}`
		);
	}

	// ── 插入模板 ──────────────────────────────────────────────────────────
	console.log("\n📚 插入代码模板...");
	for (const t of TEMPLATES) {
		await db.insert(templates).values({
			type: t.type,
			code: t.code,
			description: t.description,
		});
		console.log(`  ✓ ${t.type}`);
	}

	console.log(
		`\n✅ 完成！共插入 ${PROBLEMS.length} 条题目、${TEMPLATES.length} 个模板`
	);
	console.log(
		`📌 标记二刷: ${PROBLEMS.filter((p) => p.needsReview).length} 条`
	);
	process.exit(0);
}

seedData().catch((e) => {
	console.error("❌ 插入失败:", e);
	process.exit(1);
});
