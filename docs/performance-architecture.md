# Admin panel rendering & caching

Next.js 16.4 with `cacheComponents` and `partialPrefetching` enabled (`next.config.ts`).

## Rules for new pages
1. **No top-level `await` of session, cookies, params or searchParams in a layout or page.** Push it into an async child behind `<Suspense>` with a skeleton from `components/dashboard/page-skeletons.tsx`. Forward `params` / `searchParams` as promises and await them in the child.
2. **Fetch on the server, hydrate the client.** Page = server component that loads data and passes `initial*` props to a `*-client.tsx` component. The client seeds state from props and only refetches on filter / id changes (see `tickets-page-client.tsx`).
3. **Reads that are not data-access layer helpers live in `lib/actions` (`"use server"`) for mutations only.** `lib/session.ts` is `server-only`, not a server-action file.
4. **Heavy client code is lazy**: recharts (`telemetry-chart.tsx`) and dialogs/sheets use `next/dynamic`.

## Shell and auth
- `app/dashboard/layout.tsx` has no `await`; the sidebar/header prerender as the static shell.
- `proxy.ts` redirects requests with no session cookie to `/login` (real 307, no network).
- `<AdminGate />` (behind Suspense) redirects non-admins; the backend still authorizes every API call.
- `<SidebarUser />` streams the user menu behind its own boundary.

## Caching
- `lib/data/reference-data.ts`: device models and vendors list use `"use cache: private"` (browser-only, `stale: 60s`). Failures throw inside the cache so errors are never cached.
- Invalidation: `createDeviceModelAction` / `updateDeviceModelAction` call `updateTag("device-models")`; `verifyVendorAction` calls `updateTag("vendors-list")`. New mutations that change these lists must do the same.
- Live data (telemetry, tickets, events, device lists) is deliberately uncached.
