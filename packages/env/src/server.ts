import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		SEED_EMAIL: z.string().email().optional(),
		SEED_PASSWORD: z.string().min(8).optional(),
		LEETCODE_SESSION: z.string().optional(),
		LEETCODE_CSRF_TOKEN: z.string().optional(),
		LEETCODE_USERNAME: z.string().optional(),
		SYNC_SECRET: z.string().min(32).optional(),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
