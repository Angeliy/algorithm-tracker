import { createContext } from "@algorithm-tracker/api/context";
import { appRouter } from "@algorithm-tracker/api/routers/index";
import { runSyncSafe } from "@algorithm-tracker/api/services/leetcode-sync";
import { auth } from "@algorithm-tracker/auth";
import { db } from "@algorithm-tracker/db";
import { env } from "@algorithm-tracker/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

export const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => createContext({ context }),
	})
);

app.get("/", (c) => c.text("OK"));

app.post("/api/sync/run", async (c) => {
	const secret = c.req.header("X-Sync-Secret");
	if (!env.SYNC_SECRET || secret !== env.SYNC_SECRET) {
		return c.json({ error: "Forbidden" }, 403);
	}
	try {
		const result = await runSyncSafe(db);
		return c.json(result);
	} catch (err) {
		return c.json(
			{ error: err instanceof Error ? err.message : "Sync failed" },
			500
		);
	}
});
