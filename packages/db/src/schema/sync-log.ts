import {
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const syncStatusEnum = pgEnum("sync_status", ["success", "error"]);

export const syncLogs = pgTable("sync_logs", {
	id: uuid("id").defaultRandom().primaryKey(),
	syncedAt: timestamp("synced_at").defaultNow().notNull(),
	newProblems: integer("new_problems").default(0).notNull(),
	skippedProblems: integer("skipped_problems").default(0).notNull(),
	status: syncStatusEnum("status").notNull(),
	errorMessage: text("error_message"),
});
