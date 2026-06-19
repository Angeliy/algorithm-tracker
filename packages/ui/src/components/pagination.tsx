import { cn } from "@algorithm-tracker/ui/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
	className?: string;
	onPageChange: (page: number) => void;
	page: number;
	totalPages: number;
}

function Pagination({
	page,
	totalPages,
	onPageChange,
	className,
}: PaginationProps) {
	if (totalPages <= 1) {
		return null;
	}

	return (
		<div
			className={cn("flex items-center justify-center gap-2 pt-6", className)}
		>
			<button
				aria-label="上一页"
				className="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
				disabled={page <= 1}
				onClick={() => onPageChange(page - 1)}
				type="button"
			>
				<ChevronLeft className="h-4 w-4" />
			</button>
			<span className="min-w-20 text-center text-muted-foreground text-sm">
				第 {page} / {totalPages} 页
			</span>
			<button
				aria-label="下一页"
				className="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
				disabled={page >= totalPages}
				onClick={() => onPageChange(page + 1)}
				type="button"
			>
				<ChevronRight className="h-4 w-4" />
			</button>
		</div>
	);
}

export { Pagination };
