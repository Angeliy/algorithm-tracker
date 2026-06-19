import { env } from "@algorithm-tracker/env/server";

const GRAPHQL_URL = "https://leetcode.com/graphql";

function makeHeaders(): Record<string, string> {
	if (!(env.LEETCODE_SESSION && env.LEETCODE_CSRF_TOKEN)) {
		throw new Error(
			"LEETCODE_SESSION and LEETCODE_CSRF_TOKEN must be configured"
		);
	}
	return {
		"Content-Type": "application/json",
		Cookie: `LEETCODE_SESSION=${env.LEETCODE_SESSION}; csrftoken=${env.LEETCODE_CSRF_TOKEN}`,
		"X-CSRFToken": env.LEETCODE_CSRF_TOKEN,
		Referer: "https://leetcode.com",
		"User-Agent": "Mozilla/5.0",
	};
}

async function gql<T>(
	query: string,
	variables: Record<string, unknown>
): Promise<T> {
	const res = await fetch(GRAPHQL_URL, {
		method: "POST",
		headers: makeHeaders(),
		body: JSON.stringify({ query, variables }),
	});

	if (!res.ok) {
		throw new Error(`LeetCode API HTTP ${res.status}`);
	}

	const json = (await res.json()) as {
		data?: T;
		errors?: { message: string }[];
	};

	if (json.errors?.length) {
		throw new Error(
			`LeetCode GraphQL error: ${json.errors.at(0)?.message ?? "unknown"}`
		);
	}

	if (!json.data) {
		throw new Error("LeetCode API returned no data");
	}

	return json.data;
}

export interface AcSubmission {
	id: string;
	timestamp: string;
	title: string;
	titleSlug: string;
}

export interface SubmissionRecord {
	id: string;
	statusDisplay: string;
	timestamp: string;
}

export async function fetchRecentAC(
	username: string,
	limit: number
): Promise<AcSubmission[]> {
	const data = await gql<{ recentAcSubmissionList: AcSubmission[] }>(
		`query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id title titleSlug timestamp
      }
    }`,
		{ username, limit }
	);
	return data.recentAcSubmissionList;
}

export async function fetchSubmissions(
	questionSlug: string
): Promise<SubmissionRecord[]> {
	const data = await gql<{
		submissionList: { submissions: SubmissionRecord[] };
	}>(
		`query submissionList($questionSlug: String!, $offset: Int!, $limit: Int!) {
      submissionList(offset: $offset, limit: $limit, questionSlug: $questionSlug) {
        submissions { id statusDisplay timestamp }
      }
    }`,
		{ questionSlug, offset: 0, limit: 20 }
	);
	return data.submissionList.submissions;
}
