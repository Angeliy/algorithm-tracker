import { db, problems, problemTags } from "@algorithm-tracker/db";
import { TRPCError } from "@trpc/server";
import { and, count, eq, ilike, inArray, type SQL } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const problemShape = z.object({
	title: z.string().trim().min(1),
	source: z.string().optional(),
	difficulty: z.enum(["easy", "medium", "hard"]),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	timeSpent: z.number().int().positive().optional(),
	isAc: z.boolean().default(false),
	note: z.string().optional(),
	tags: z.array(z.string()).default([]),
});

function normalizeTags(tags: string[]): string[] {
	return Array.from(
		new Set(tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0))
	);
}

export const problemRouter = router({
	create: protectedProcedure.input(problemShape).mutation(({ input }) => {
		const { tags, ...rest } = input;
		return db.transaction(async (tx) => {
			const [created] = await tx.insert(problems).values(rest).returning();
			if (!created) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create problem",
				});
			}
			const normalized = normalizeTags(tags);
			if (normalized.length > 0) {
				await tx
					.insert(problemTags)
					.values(normalized.map((tag) => ({ problemId: created.id, tag })));
			}
			return created;
		});
	}),

	update: protectedProcedure
		.input(problemShape.extend({ id: z.string().uuid() }))
		.mutation(({ input }) => {
			const { id, tags, ...rest } = input;
			return db.transaction(async (tx) => {
				const [updated] = await tx
					.update(problems)
					.set(rest)
					.where(eq(problems.id, id))
					.returning();
				if (!updated) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Problem not found",
					});
				}
				await tx.delete(problemTags).where(eq(problemTags.problemId, id));
				const normalized = normalizeTags(tags);
				if (normalized.length > 0) {
					await tx
						.insert(problemTags)
						.values(normalized.map((tag) => ({ problemId: id, tag })));
				}
				return updated;
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [deleted] = await db
				.delete(problems)
				.where(eq(problems.id, input.id))
				.returning();
			if (!deleted) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Problem not found",
				});
			}
			return deleted;
		}),

	list: protectedProcedure
		.input(
			z.object({
				difficulty: z.enum(["easy", "medium", "hard"]).optional(),
				tag: z.string().optional(),
				isAc: z.boolean().optional(),
				keyword: z.string().optional(),
				page: z.number().int().min(1).default(1),
				pageSize: z.number().int().min(1).max(100).default(20),
			})
		)
		.query(async ({ input }) => {
			const { difficulty, tag, isAc, keyword, page, pageSize } = input;
			const trimmedTag = tag?.trim().toLowerCase();

			const conditions: SQL[] = [];
			if (difficulty) {
				conditions.push(eq(problems.difficulty, difficulty));
			}
			if (isAc !== undefined) {
				conditions.push(eq(problems.isAc, isAc));
			}
			if (keyword?.trim()) {
				conditions.push(ilike(problems.title, `%${keyword.trim()}%`));
			}

			if (trimmedTag) {
				const matchingIds = await db
					.select({ problemId: problemTags.problemId })
					.from(problemTags)
					.where(ilike(problemTags.tag, trimmedTag));
				const ids = matchingIds.map((r) => r.problemId);
				if (ids.length === 0) {
					return { items: [], total: 0, page, pageSize, totalPages: 0 };
				}
				conditions.push(inArray(problems.id, ids));
			}

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const countResult = await db
				.select({ total: count() })
				.from(problems)
				.where(where);
			const total = countResult[0]?.total ?? 0;

			if (total === 0) {
				return { items: [], total: 0, page, pageSize, totalPages: 0 };
			}

			const totalPages = Math.ceil(total / pageSize);
			const safePage = Math.min(page, totalPages);

			const rows = await db
				.select()
				.from(problems)
				.where(where)
				.orderBy(problems.date)
				.limit(pageSize)
				.offset((safePage - 1) * pageSize);

			const rowIds = rows.map((p) => p.id);
			const tagRows = await db
				.select()
				.from(problemTags)
				.where(inArray(problemTags.problemId, rowIds));

			const tagMap = new Map<string, string[]>();
			for (const t of tagRows) {
				const existing = tagMap.get(t.problemId) ?? [];
				existing.push(t.tag);
				tagMap.set(t.problemId, existing);
			}

			return {
				items: rows.map((p) => ({ ...p, tags: tagMap.get(p.id) ?? [] })),
				total,
				page: safePage,
				pageSize,
				totalPages,
			};
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ input }) => {
			const [problem] = await db
				.select()
				.from(problems)
				.where(eq(problems.id, input.id));
			if (!problem) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Problem not found",
				});
			}
			const tags = await db
				.select({ tag: problemTags.tag })
				.from(problemTags)
				.where(eq(problemTags.problemId, input.id));
			return { ...problem, tags: tags.map((t) => t.tag) };
		}),
});
