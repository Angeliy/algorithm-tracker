import "dotenv/config";
import { auth } from "@algorithm-tracker/auth";
import { env } from "@algorithm-tracker/env/server";

async function seed() {
	if (!(env.SEED_EMAIL && env.SEED_PASSWORD)) {
		console.error("SEED_EMAIL and SEED_PASSWORD must be set in .env");
		process.exit(1);
	}

	try {
		await auth.api.signUpEmail({
			body: {
				email: env.SEED_EMAIL,
				password: env.SEED_PASSWORD,
				name: "Admin",
			},
		});
		console.log("✅ Seeded account:", env.SEED_EMAIL);
	} catch (e) {
		const msg = String(e);
		if (
			msg.includes("already exists") ||
			msg.includes("USER_ALREADY_EXISTS") ||
			msg.includes("UNIQUE constraint") ||
			msg.includes("duplicate key")
		) {
			console.log("ℹ️  Account already exists, skipping.");
		} else {
			console.error("❌ Seed failed:", e);
			process.exit(1);
		}
	}
}

seed();
