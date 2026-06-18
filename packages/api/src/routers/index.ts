import { protectedProcedure, publicProcedure, router } from "../index";
import { problemRouter } from "./problem";
import { problemLinkRouter } from "./problem-link";
import { reviewRouter } from "./review";
import { statsRouter } from "./stats";
import { templateRouter } from "./template";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	privateData: protectedProcedure.query(({ ctx }) => ({
		message: "This is private",
		user: ctx.session.user,
	})),
	problem: problemRouter,
	stats: statsRouter,
	review: reviewRouter,
	template: templateRouter,
	problemLink: problemLinkRouter,
});
export type AppRouter = typeof appRouter;
