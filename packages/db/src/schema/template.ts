import {
	pgTable,
	serial,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { problems } from "./problem";

export const templates = pgTable("templates", {
	id: uuid("id").defaultRandom().primaryKey(),
	type: text("type").notNull(),
	code: text("code").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const problemLinks = pgTable(
	"problem_links",
	{
		id: serial("id").primaryKey(),
		problemAId: uuid("problem_a_id")
			.references(() => problems.id, { onDelete: "cascade" })
			.notNull(),
		problemBId: uuid("problem_b_id")
			.references(() => problems.id, { onDelete: "cascade" })
			.notNull(),
	},
	(t) => [unique().on(t.problemAId, t.problemBId)]
);
