import { readFileSync, watch } from "node:fs";
import { fileURLToPath } from "node:url";
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
import { streamSSE } from "hono/streaming";

const STATUS_FILE = fileURLToPath(
	new URL("../../../specs/workflow-status.json", import.meta.url)
);
const STATUS_DIR = fileURLToPath(new URL("../../../specs/", import.meta.url));
const IDLE_WORKFLOW_STATUS = { status: "idle" } as const;

function readWorkflowStatus(): string {
	try {
		return readFileSync(STATUS_FILE, "utf-8");
	} catch {
		return JSON.stringify(IDLE_WORKFLOW_STATUS);
	}
}

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

app.get("/api/workflow/stream", (c) =>
	streamSSE(c, async (stream) => {
		const send = async () => {
			try {
				await stream.writeSSE({ data: readWorkflowStatus(), event: "status" });
			} catch {
				// stream already closed
			}
		};

		await send();

		let watcher: ReturnType<typeof watch> | undefined;
		try {
			watcher = watch(STATUS_DIR, { persistent: false }, (_event, filename) => {
				if (filename === "workflow-status.json") {
					send().catch(() => undefined);
				}
			});
		} catch {
			// fs.watch unavailable; serve initial state only
		}

		const heartbeat = setInterval(() => {
			stream.writeSSE({ data: "", event: "ping" }).catch(() => undefined);
		}, 30_000);

		await new Promise<void>((resolve) => {
			stream.onAbort(() => {
				watcher?.close();
				clearInterval(heartbeat);
				resolve();
			});
		});
	})
);

app.get("/api/workflow/status", (c) => {
	const status = JSON.parse(readWorkflowStatus()) as unknown;
	return c.json(status);
});
