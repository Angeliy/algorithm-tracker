import { runSyncSafe } from "@algorithm-tracker/api/services/leetcode-sync";
import { db } from "@algorithm-tracker/db";
import { env } from "@algorithm-tracker/env/server";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { app } from "./app";

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	}
);

if (env.LEETCODE_SESSION && env.LEETCODE_USERNAME) {
	cron.schedule(
		"0 9 * * *",
		async () => {
			try {
				const result = await runSyncSafe(db);
				console.log(
					`[cron] LeetCode sync: +${result.newProblems} new, ${result.skippedProblems} skipped`
				);
			} catch (err) {
				console.error(
					"[cron] LeetCode sync failed:",
					err instanceof Error ? err.message : err
				);
			}
		},
		{ timezone: "Asia/Shanghai" }
	);
	console.log("Cron job registered: LeetCode sync at 09:00");
}
