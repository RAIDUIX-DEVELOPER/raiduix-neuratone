# Storage integration (Vercel Blob and Edge Config)

This project uses Vercel storage primitives for two complementary needs:

- Edge Config: Read-heavy, infrequently updated config/flags. Ultra-low latency at the edge.
- Blob: Binary/object storage for media and generated assets.

## Setup

1. Create stores in Vercel Dashboard

- Edge Config: Project-level store auto-creates `EDGE_CONFIG` env.
- Blob: Project-level store auto-creates `BLOB_READ_WRITE_TOKEN` env.

2. Pull envs locally

- Use `vercel env pull` to populate a `.env.local` based on `.env.example`.

## Edge Config usage

- Helpers are in `lib/storage/edgeConfig.ts`:
  - `ecGet(key)`, `ecGetAll(keys?)`, `ecHas(key)`, `ecDigest()`
  - Returns are immutable; clone before mutation.
- Writes should be via Dashboard or the Vercel REST API (PATCH items) from CI/backoffice.
- Prefer using in Middleware / Edge Functions for feature gates and critical routing.

Docs:

- Edge Config overview: https://vercel.com/docs/edge-config
- Edge Config SDK: https://vercel.com/docs/edge-config/edge-config-sdk
- REST API (update items in batch): https://vercel.com/docs/rest-api/endpoints/edge-config#update-items-in-batch
- Dashboard: https://vercel.com/docs/edge-config/edge-config-dashboard

## Blob usage

- Server helpers in `lib/storage/blob.ts`:
  - `uploadBlob(pathname, body, { access: 'public', addRandomSuffix: true })`
  - `deleteBlob(urlOrPath)`, `getBlobMeta(urlOrPath)`, `listBlobs(prefix)`, `copyBlob(from, to)`
- For uploads >4.5MB use client uploads (`@vercel/blob/client`) with a server route using `handleUpload()`.
- Treat blobs as immutable or use `allowOverwrite` with caching caveats. Consider adding suffixes.

Docs:

- Blob overview: https://vercel.com/docs/vercel-blob
- Server uploads: https://vercel.com/docs/vercel-blob/server-upload
- Client uploads: https://vercel.com/docs/vercel-blob/client-upload
- SDK reference: https://vercel.com/docs/vercel-blob/using-blob-sdk

Environment variables:

- Edge Config read connection string: `EDGE_CONFIG` (auto-created when configuring project-level Edge Config)
- Edge Config writes: `EDGE_CONFIG_ID` and `VERCEL_API_TOKEN` (create Personal Access Token in Vercel → Account Settings → Tokens)
- Blob: `BLOB_READ_WRITE_TOKEN` (auto-created when you create a Blob store and connect it to the project)
- Optional local dev callback: `VERCEL_BLOB_CALLBACK_URL` (e.g., your ngrok HTTPS URL)
- Auth: `AUTH_JWT_SECRET` (strong, random secret for JWT signing)

## Security notes

- Never expose `BLOB_READ_WRITE_TOKEN` to the browser. Use `@vercel/blob/client` which exchanges a short-lived client token via your server.
- Validate `onBeforeGenerateToken` input and authorize users before issuing client upload tokens.
- Prefer `addRandomSuffix: true` to avoid path collisions and reduce enumeration risk.
- If you need to avoid blob indexing by search engines, upload a `robots.txt` at the root of your store.

## Next steps

- Wire a minimal API route for client uploads when needed.
- Optionally add JSON schema protection for Edge Config via the dashboard.
- If serving images from Blob via `next/image`, add your store domain to `next.config.ts` images.remotePatterns.

## Verify your setup

- Hit `GET /api/health/storage` in your deployed environment:

  - `edgeConfig.readOk` should be `true` and `digest` non-empty (requires `EDGE_CONFIG`).
  - `edgeConfig.writeOk` should be `true` (requires `EDGE_CONFIG_ID` + `VERCEL_API_TOKEN`).
  - `blob.listOk` should be `true` (requires `BLOB_READ_WRITE_TOKEN`).

- Forum smoke test:
  1. Sign up a test user, then create a post with `#tag` and an image upload.
  2. Like the post once.
  3. Confirm:
     - Edge Config dashboard shows new `forum:index` and `forum:posts:<id>` keys.
     - Blob dashboard lists your uploaded `forum/` object; URL is public and renders.
