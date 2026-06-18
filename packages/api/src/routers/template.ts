import { db, templates } from "@algorithm-tracker/db";
import { TRPCError } from "@trpc/server";
import { eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const templateShape = z.object({
	type: z.string().trim().min(1),
	code: z.string().min(1),
	description: z.string().optional(),
});

export const templateRouter = router({
	list: protectedProcedure
		.input(z.object({ keyword: z.string().optional() }))
		.query(({ input }) => {
			const { keyword } = input;
			const trimmed = keyword?.trim();

			if (trimmed) {
				const pattern = `%${trimmed}%`;
				return db
					.select()
					.from(templates)
					.where(
						or(
							ilike(templates.type, pattern),
							ilike(templates.description, pattern)
						)
					)
					.orderBy(templates.type, templates.createdAt);
			}

			return db
				.select()
				.from(templates)
				.orderBy(templates.type, templates.createdAt);
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
