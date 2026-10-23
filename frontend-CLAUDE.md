# Fintrack-frontend

React 19 + Vite + Tailwind 4 + React Query. Deployed on **Vercel**; talks to the backend at `VITE_API_URL` (Render). Installable PWA (`vite-plugin-pwa`).

## Run and test
- Install: `npm ci` (Node 22)
- Checks (all must pass, same as CI job `check`): `npm test && npm run lint && npm run build`
- Local app: `VITE_API_URL=http://localhost:8000/api npm run dev -- --port 5173` with the backend running locally (`NODE_ENV=development ALLOW_DEV_BYPASS=true node server.js` in Fintrack-backend). Log in with the dev password `maverick`. Only port 5173 is allowed by the backend's CORS.

## Rules for any change
- **Requests:**
  - **reads** use `api.get(...).then((res) => res.data)`;
  - **`handleRequest` is only for writes**. It invalidates every query, and using it for reads caused an endless request loop on the Dashboard.
- **Money formatting:** always `formatCurrency` / `formatNumber` from `src/utils/formatUtils.js`. If you pass `maximumFractionDigits`, the helpers handle the minimum.
- **Dates:** "today" is Toronto time. Use the shared helpers; don't use `toISOString().slice(0, 10)`.
- **Categories:** import `EXPENSE_CATEGORIES` from `src/constants/categories.js`. Don't keep separate lists.
- **Mobile first:**
  - check every UI change at **360 px and 390 px** (and 768 / 1440);
  - no sideways page scroll;
  - tap targets of at least 40 px;
  - amounts never cut off.
- **JSX:** ESLint has `react/jsx-no-undef`. A missing import fails lint, so run lint before pushing.
- **Tests:** pure logic lives in `src/utils/*.js` with a `*.test.js` next to it, added to the `npm test` script.

## Pull requests
- Branch from `main`; never push to `main`. One PR per change.
- In the PR description, say which screens changed and at which widths you checked them.
- Don't merge. Maverick merges after review and green CI.
