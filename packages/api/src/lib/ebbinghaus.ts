import { addDays, format } from "date-fns";

const SCHEDULE = [1, 3, 7, 15, 30] as const;

export const REVIEW_TOTAL = SCHEDULE.length;

export function getNextReviewDate(
	markedAt: Date,
	reviewCount: number
): string | null {
	const intervalDays = SCHEDULE[reviewCount];

	if (intervalDays === undefined) {
		return null;
	}

	return format(addDays(markedAt, intervalDays), "yyyy-MM-dd");
}
