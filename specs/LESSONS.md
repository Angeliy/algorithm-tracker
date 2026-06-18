# LESSONS — algorithm-tracker

## 2026-06-17 — Feature 2 / DB Schema & tRPC

**`db:push` over migrations during development.** Using `pnpm db:push` skips generating migration files; all schema changes are pushed directly. This is intentional for the dev phase — do not run `db:generate` / `db:migrate` until production migration flow is needed.

**Single-user design (no userId column).** The `problems` and `templates` tables have no `userId` foreign key. This is a deliberate architectural choice for a personal single-user tracker. Codex repeatedly flagged this — accept and ignore.

**tRPC `list` query without `async`.** If a query handler returns a Promise directly (e.g. `return db.select()...`) without needing `await`, mark it as non-async. Biome `useAwait` rule will error on `async` functions that never use `await`.

## 2026-06-17 — Feature 2 / Cache Invalidation

**Prefix-based invalidation for filtered queries.** Using `queryClient.invalidateQueries({ queryKey: [["problem", "list"]] })` (prefix) instead of exact key `trpc.problem.list.queryOptions({})` is required to invalidate all cached variants of the list (with different filter combos). Use this pattern whenever mutating problems.

## 2026-06-17 — Feature 3 / Date Handling

**`new Date("yyyy-MM-dd")` parses as UTC midnight** — in negative UTC offset timezones this rolls back one day. Always use `parseISO("yyyy-MM-dd")` from `date-fns` when converting DB date strings to Date objects. Also avoid `new Date().toISOString().slice(0,10)` for default form values; compute local date manually instead.

## 2026-06-17 — Feature 4 / shadcn Registry Offline

**shadcn CLI registry is unreachable in this environment.** Cannot use `pnpm dlx shadcn add <component>`. All UI components (`AlertDialog`, `Dialog`, `Badge`, `Select`, `Textarea`) must be written manually. Use `@base-ui/react/<component>` (Base UI, not Radix), with the `render` prop pattern for composable trigger/action elements. Reference existing components in `packages/ui/src/components/` for the pattern.

## 2026-06-17 — Feature 5 / Cognitive Complexity

**Biome max complexity = 20.** A route component that combines data fetching + mutations + conditional rendering can exceed this easily. Extract logical sub-sections (e.g. `LinkedProblems`) into their own functions at the module level — not nested inside the parent component. This satisfies the `noExcessiveCognitiveComplexity` rule and is good practice anyway.

## 2026-06-17 — Feature 5 / TanStack Query `enabled` Option

**`useQuery(trpcOptions, { enabled: ... })` is wrong.** The second argument to `useQuery` is `QueryClient`, not extra options. To conditionally enable a tRPC query, spread the options object: `useQuery({ ...trpc.x.queryOptions(...), enabled: condition })`.

## 2026-06-17 — Feature 5 / problem.list keyword Search

**`problem.list` keyword param was not in the original schema.** The task notes said to add it without breaking existing filters. Add `keyword: z.string().optional()` to the input schema and an `ilike(problems.title, ...)` condition in the query — it composes naturally with the existing `difficulty`, `tag`, `isAc` filters via `conditions.push(...)`.
