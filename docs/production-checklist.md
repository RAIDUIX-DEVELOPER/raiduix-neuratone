# Production Checklist: Storage + Forum

Use this checklist when deploying to production to ensure storage systems and forum features work end-to-end.

## Required Environment Variables

- EDGE_CONFIG: Project Edge Config connection string (auto-created).
- EDGE_CONFIG_ID: The Edge Config ID (for REST writes).
- VERCEL_API_TOKEN: Personal Access Token with permissions to update Edge Config.
- BLOB_READ_WRITE_TOKEN: Token for Vercel Blob store (auto-created).
- AUTH_JWT_SECRET: Strong secret (>=64 chars) used to sign forum JWT cookies.
- Optional: VERCEL_BLOB_CALLBACK_URL: Public HTTPS base for onUploadCompleted in local dev.

Set these in Vercel Dashboard → Project → Settings → Environment Variables. Also run `vercel env pull` locally.

## Health-check route

- GET /api/health/storage
  - edgeConfig.readOk should be true (digest present)
  - edgeConfig.writeOk should be true (requires EDGE_CONFIG_ID + VERCEL_API_TOKEN)
  - blob.listOk should be true (requires BLOB_READ_WRITE_TOKEN)

## next/image remotePatterns (if used)

If you render Blob URLs with next/image, add your store domain:

- next.config.ts
  - images.remotePatterns = [ { protocol: 'https', hostname: '<store-id>.public.blob.vercel-storage.com', pathname: '/**' } ]

## CSP (already configured)

- middleware.ts includes:
  - img-src/media-src: blob: https://\*.public.blob.vercel-storage.com

## Forum E2E checks

1. Sign up → should create user in Edge Config (index + user key)
2. Log in → sets httpOnly cookie (forum_session)
3. Create post → writes post + updates index (Edge Config REST)
4. Like a post → increments likes (Edge Config REST)
5. Attachments → upload via client to Blob, URL renders in Feed

## Dashboards

- Edge Config dashboard: verify items change after posting/liking
- Blob dashboard: verify uploaded objects exist and are public

## Security

- Strong AUTH_JWT_SECRET
- Do not expose BLOB_READ_WRITE_TOKEN to client
- Upload route requires auth, restrict allowedContentTypes/size
- Consider adding rate limiting and CSRF for forum APIs
