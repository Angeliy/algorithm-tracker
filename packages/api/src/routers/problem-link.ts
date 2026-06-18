import { db, problemLinks, problems, problemTags } from "@algorithm-tracker/db";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const problemLinkRouter = router({
	add: protectedProcedure
		.input(
			z.object({
				problemAId: z.string().uuid(),
				problemBId: z.string().uuid(),
			})
		)
		.mutation(async ({ input }) => {
			if (input.problemAId === input.problemBId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "不能关联自身",
				});
			}
			const [a, b] = [input.problemAId, input.problemBId].sort() as [
				string,
				string,
			];
			await db
				.insert(problemLinks)
				.values({ problemAId: a, problemBId: b })
				.onConflictDoNothing();
		}),

	remove: protectedProcedure
		.input(
			z.object({
				problemAId: z.string().uuid(),
				problemBId: z.string().uuid(),
			})
		)
		.mutation(async ({ input }) => {
			const [a, b] = [input.problemAId, input.problemBId].sort() as [
				string,
				string,
			];
			await db
				.delete(problemLinks)
				.where(
					and(eq(problemLinks.problemAId, a), eq(problemLinks.problemBId, b))
				);
		}),

	getLinked: protectedProcedure
		.input(z.object({ problemId: z.string().uuid() }))
		.query(async ({ input }) => {
			const { problemId } = input;
			const links = await db
				.select()
				.from(problemLinks)
				.where(
					or(
						eq(problemLinks.problemAId, problemId),
						eq(problemLinks.problemBId, problemId)
					)
				);

			if (links.length === 0) {
				return [];
			}

			const linkedIds = links.map((l) =>
				l.problemAId === problemId ? l.problemBId : l.problemAId
			);

			const rows = await db
				.select()
				.from(problems)
				.where(inArray(problems.id, linkedIds));

			if (rows.length === 0) {
				return [];
			}

			const tagRows = await db
				.select()
				.from(problemTags)
				.where(inArray(problemTags.problemId, linkedIds));

			const tagMap = new Map<string, string[]>();
			for (const t of tagRows) {
				const existing = tagMap.get(t.problemId) ?? [];
				existing.push(t.tag);
				tagMap.set(t.problemId, existing);
			}

			return rows.map((p) => ({ ...p, tags: tagMap.get(p.id) ?? [] }));
		}),
});
