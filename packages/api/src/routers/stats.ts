import { db, problems } from "@algorithm-tracker/db";
import { format, startOfWeek, subDays } from "date-fns";
import { desc, gte, sql } from "drizzle-orm";

import { protectedProcedure, router } from "../index";

function computeStreak(dates: string[], today: string): number {
	if (dates.length === 0) {
		return 0;
	}

	const sorted = [...new Set(dates)].sort().reverse();
	const yesterday = format(subDays(new Date(today), 1), "yyyy-MM-dd");
	const seed =
		sorted[0] === today || sorted[0] === yesterday ? sorted[0] : null;

	if (!seed) {
		return 0;
	}

	let streak = 1;
	let prev = seed;

	for (let i = 1; i < sorted.length; i++) {
		const expected = format(subDays(new Date(prev), 1), "yyyy-MM-dd");
		if (sorted[i] !== expected) {
			break;
		}
		streak++;
		prev = sorted[i] as string;
	}

	return streak;
}

export const statsRouter = router({
	getOverview: protectedProcedure.query(async () => {
		const [totalRow] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(problems);

		const monday = format(
			startOfWeek(new Date(), { weekStartsOn: 1 }),
			"yyyy-MM-dd"
		);
		const [weekRow] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(problems)
			.where(gte(problems.date, monday));

		const thirtyDaysAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");
		const today = format(new Date(), "yyyy-MM-dd");

		const trendRows = await db
			.select({
				date: problems.date,
				count: sql<number>`count(*)::int`,
			})
			.from(problems)
			.where(gte(problems.date, thirtyDaysAgo))
			.groupBy(problems.date);

		const trendMap = new Map(trendRows.map((r) => [r.date, r.count]));
		const dailyTrend: Array<{ date: string; count: number }> = [];
		for (let i = 29; i >= 0; i--) {
			const d = format(subDays(new Date(), i), "yyyy-MM-dd");
			dailyTrend.push({ date: d, count: trendMap.get(d) ?? 0 });
		}

		const allDates = await db
			.selectDistinct({ date: problems.date })
			.from(problems)
			.orderBy(desc(problems.date));

		const streak = computeStreak(
			allDates.map((r) => r.date),
			today
		);

		return {
			total: totalRow?.count ?? 0,
			thisWeek: weekRow?.count ?? 0,
			streak,
			dailyTrend,
		};
	}),
});
