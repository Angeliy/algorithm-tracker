import { problems, problemTags, syncLogs } from "@algorithm-tracker/db";
import { env } from "@algorithm-tracker/env/server";
import { addDays, format, fromUnixTime, parseISO } from "date-fns";
import { eq } from "drizzle-orm";
import { fetchRecentAC, fetchSubmissions } from "./leetcode-client";

export interface SyncResult {
	newProblems: number;
	skippedProblems: number;
}

function toLocalDate(unixSeconds: string): string {
	return format(fromUnixTime(Number(unixSeconds)), "yyyy-MM-dd");
}

function nextDayStr(dateStr: string): string {
	return format(addDays(parseISO(dateStr), 1), "yyyy-MM-dd");
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle instance type varies across packages
export async function runSync(db: any): Promise<SyncResult> {
	if (!env.LEETCODE_USERNAME) {
		throw new Error("LEETCODE_USERNAME must be configured");
	}

	const acList = await fetchRecentAC(env.LEETCODE_USERNAME, 20);

	let newProblems = 0;
	let skippedProblems = 0;

	for (const ac of acList) {
		const date = toLocalDate(ac.timestamp);

		const existing = await db
			.select({ id: problems.id })
			.from(problems)
			.where(eq(problems.title, ac.title))
			.limit(1);

		if (existing.length > 0) {
			skippedProblems++;
			continue;
		}

		let hasWA = false;
		try {
			const submissions = await fetchSubmissions(ac.titleSlug);
			const acTimestamp = Number(ac.timestamp);
			hasWA = submissions.some(
				(s) =>
					s.statusDisplay === "Wrong Answer" &&
					Number(s.timestamp) < acTimestamp
			);
		} catch {
			// If submission history is unavailable, assume clean AC
		}

		const [inserted] = await db
			.insert(problems)
			.values({
				title: ac.title,
				source: "LeetCode自动同步",
				difficulty: "medium" as const,
				date,
				isAc: true,
				needsReview: hasWA,
				markedReviewAt: hasWA ? date : null,
				nextReviewAt: hasWA ? nextDayStr(date) : null,
				reviewCount: 0,
				reviewArchived: false,
			})
			.returning({ id: problems.id });

		if (inserted?.id) {
			await db
				.insert(problemTags)
				.values({ problemId: inserted.id, tag: "LeetCode" });
		}

		newProblems++;
	}

	await db.insert(syncLogs).values({
		newProblems,
		skippedProblems,
		status: "success" as const,
	});

	return { newProblems, skippedProblems };
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle instance type varies across packages
export async function runSyncSafe(db: any): Promise<SyncResult> {
	try {
		return await runSync(db);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await db.insert(syncLogs).values({
			newProblems: 0,
			skippedProblems: 0,
			status: "error" as const,
			errorMessage: message,
		});
		throw err;
	}
}
