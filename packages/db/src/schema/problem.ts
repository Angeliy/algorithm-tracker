import {
	boolean,
	date,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

export const problems = pgTable("problems", {
	id: uuid("id").defaultRandom().primaryKey(),
	title: text("title").notNull(),
	source: text("source"),
	difficulty: difficultyEnum("difficulty").notNull(),
	date: date("date").notNull(),
	timeSpent: integer("time_spent"),
	isAc: boolean("is_ac").default(false).notNull(),
	note: text("note"),
	needsReview: boolean("needs_review").default(false).notNull(),
	markedReviewAt: date("marked_review_at"),
	reviewCount: integer("review_count").default(0).notNull(),
	nextReviewAt: date("next_review_at"),
	reviewArchived: boolean("review_archived").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const problemTags = pgTable(
	"problem_tags",
	{
		id: serial("id").primaryKey(),
		problemId: uuid("problem_id")
			.references(() => problems.id, { onDelete: "cascade" })
			.notNull(),
		tag: text("tag").notNull(),
	},
	(t) => [unique().on(t.problemId, t.tag)]
);
