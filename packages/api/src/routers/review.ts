import { db, problems } from "@algorithm-tracker/db";
import { TRPCError } from "@trpc/server";
import { format, parseISO } from "date-fns";
import { and, count, eq, lte } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { getNextReviewDate, REVIEW_TOTAL } from "../lib/ebbinghaus";

export const reviewRouter = router({
	markForReview: protectedProcedure
		.input(z.object({ problemId: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [problem] = await db
				.select()
				.from(problems)
				.where(eq(problems.id, input.problemId));

			if (!problem) {
				throw new TRPCError({ code: "NOT_FOUND", message: "题目不存在" });
			}

			if (problem.needsReview && !problem.reviewArchived) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "已在复习队列",
				});
			}

			const today = format(new Date(), "yyyy-MM-dd");
			const nextReviewAt = getNextReviewDate(new Date(), 0);

			const [updated] = await db
				.update(problems)
				.set({
					needsReview: true,
					markedReviewAt: today,
					reviewCount: 0,
					nextReviewAt,
					reviewArchived: false,
				})
				.where(eq(problems.id, input.problemId))
				.returning();

			return updated;
		}),

	completeReview: protectedProcedure
		.input(z.object({ problemId: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [problem] = await db
				.select()
				.from(problems)
				.where(eq(problems.id, input.problemId));

			if (!problem) {
				throw new TRPCError({ code: "NOT_FOUND", message: "题目不存在" });
			}
			if (!problem.needsReview || problem.reviewArchived) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "该题目不在待复习状态",
				});
			}
			const today = format(new Date(), "yyyy-MM-dd");
			if (problem.nextReviewAt && problem.nextReviewAt > today) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `复习时间未到（应复习日期：${problem.nextReviewAt}）`,
				});
			}

			const newCount = problem.reviewCount + 1;

			if (newCount >= REVIEW_TOTAL) {
				const [updated] = await db
					.update(problems)
					.set({
						reviewCount: newCount,
						reviewArchived: true,
						nextReviewAt: null,
					})
					.where(eq(problems.id, input.problemId))
					.returning();
				return updated;
			}

			if (!problem.markedReviewAt) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "复习记录缺少标记日期",
				});
			}
			const nextReviewAt = getNextReviewDate(
				parseISO(problem.markedReviewAt),
				newCount
			);
			const [updated] = await db
				.update(problems)
				.set({ reviewCount: newCount, nextReviewAt })
				.where(eq(problems.id, input.problemId))
				.returning();
			return updated;
		}),

	getPending: protectedProcedure
		.input(
			z.object({
				page: z.number().int().min(1).default(1),
				pageSize: z.number().int().min(1).max(100).default(20),
			})
		)
		.query(async ({ input }) => {
			const { page, pageSize } = input;
			const today = format(new Date(), "yyyy-MM-dd");
			const where = and(
				eq(problems.needsReview, true),
				eq(problems.reviewArchived, false),
				lte(problems.nextReviewAt, today)
			);

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

			const items = await db
				.select()
				.from(problems)
				.where(where)
				.orderBy(problems.nextReviewAt)
				.limit(pageSize)
				.offset((safePage - 1) * pageSize);

			return { items, total, page: safePage, pageSize, totalPages };
		}),
});
