import { addDays, format } from "date-fns";

const SCHEDULE = [1, 3, 7, 15, 30] as const;

export const REVIEW_TOTAL = SCHEDULE.length;

export function getNextReviewDate(
	markedAt: Date,
	reviewCount: number
): string | null {
	if (reviewCount >= SCHEDULE.length) {
		return null;
	}
	return format(addDays(markedAt, SCHEDULE[reviewCount]), "yyyy-MM-dd");
}
