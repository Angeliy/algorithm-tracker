import { db, templates } from "@algorithm-tracker/db";
import { TRPCError } from "@trpc/server";
import { count, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const templateShape = z.object({
	type: z.string().trim().min(1),
	code: z.string().min(1),
	description: z.string().optional(),
});

export const templateRouter = router({
	list: protectedProcedure
		.input(
			z.object({
				keyword: z.string().optional(),
				page: z.number().int().min(1).default(1),
				pageSize: z.number().int().min(1).max(100).default(20),
			})
		)
		.query(async ({ input }) => {
			const { keyword, page, pageSize } = input;
			const trimmed = keyword?.trim();
			const where = trimmed
				? or(
						ilike(templates.type, `%${trimmed}%`),
						ilike(templates.description, `%${trimmed}%`)
					)
				: undefined;

			const countResult = await db
				.select({ total: count() })
				.from(templates)
				.where(where);
			const total = countResult[0]?.total ?? 0;

			if (total === 0) {
				return { items: [], total: 0, page, pageSize, totalPages: 0 };
			}

			const totalPages = Math.ceil(total / pageSize);
			const safePage = Math.min(page, totalPages);

			const items = await db
				.select()
				.from(templates)
				.where(where)
				.orderBy(templates.type, templates.createdAt)
				.limit(pageSize)
				.offset((safePage - 1) * pageSize);

			return { items, total, page: safePage, pageSize, totalPages };
		}),

	create: protectedProcedure
		.input(templateShape)
		.mutation(async ({ input }) => {
			const [created] = await db.insert(templates).values(input).returning();
			if (!created) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create template",
				});
			}
			return created;
		}),

	update: protectedProcedure
		.input(templateShape.extend({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const { id, ...rest } = input;
			const [updated] = await db
				.update(templates)
				.set(rest)
				.where(eq(templates.id, id))
				.returning();
			if (!updated) {
				throw new TRPCError({ code: "NOT_FOUND", message: "模板不存在" });
			}
			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [deleted] = await db
				.delete(templates)
				.where(eq(templates.id, input.id))
				.returning();
			if (!deleted) {
				throw new TRPCError({ code: "NOT_FOUND", message: "模板不存在" });
			}
			return deleted;
		}),
});
