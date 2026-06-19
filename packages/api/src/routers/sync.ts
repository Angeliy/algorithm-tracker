import { db, syncLogs } from "@algorithm-tracker/db";
import { TRPCError } from "@trpc/server";
import { desc } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import { runSyncSafe } from "../services/leetcode-sync";

export const syncRouter = router({
	trigger: protectedProcedure.mutation(async () => {
		try {
			return await runSyncSafe(db);
		} catch (err) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: err instanceof Error ? err.message : "Sync failed",
			});
		}
	}),

	lastLog: protectedProcedure.query(async () => {
		const [log] = await db
			.select()
			.from(syncLogs)
			.orderBy(desc(syncLogs.syncedAt))
			.limit(1);
		return log ?? null;
	}),
});
