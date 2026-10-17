# Public branding metadata cleanup · 17 October 2026

The app entry still referenced Lovable's Open Graph image and Twitter account, the old Dashboard title, and a KWS image as its web icon. The manifest also claimed two icon sizes for the same old image.

App fix: https://github.com/moonsightmedia/KWS-BETA-APP/pull/15, merged into main as 42a893349f953ac1f9096a090b99b9be36fb29c9. Production published this exact revision at 15:20:42 UTC. App version remains 1.0.242; application source and entry-body logic are unchanged. The approved Beta symbol is now provided as ICO, SVG, 180 px Apple icon, and real 192/512 px PNG manifest icons. The app uses a locally hosted 1200×630 social preview. Draft variant labels were removed from existing brand SVG titles. Product KWS logos are retained.

Landing release 6f9827be17a15fea published at 15:14:03 UTC; legal Open Graph descriptions now match their own pages. Static legal pages remain script-free and noindex; the landing remains indexable. The independent landing mount is retained.

Deployment compatibility: app smoke checks now compare legal routes against their verified static landing release instead of expecting SPA HTML. Seven operator tests pass. The installed, pinned operator SHA256 is 0641e6cc4e790709941db78e236c5167005e74ca60d21be44cdff36bd671695a. Previous operator/config retained under /opt/kws/github-web-autodeploy/before-branding-20261017T151450Z. No database, API, mail, native installer or main KWS website changes.

Verification: clean CI succeeded for the PR and exact main revision (runs 39044195694 and 39044430024), including functional, deployment, browser and production-build checks. A live audit checks nine app/landing/legal routes, ten exact icon/manifest/image files against Git, real icon dimensions, the sitemap and Google verification file. Two rendered QA loops cover 375, 768, 1280 and 1920 px; no page overflow or runtime errors. The live auth screen renders with Beta branding and sends no requests to Lovable. Reports/screenshots: output/landing-v30/audit-results.json and neighboring PNG files (local ignored QA artifacts).

The remaining lovable-tagger package is development-only; its Vite plugin is disabled in production. It is not a public logo, tracker or metadata reference. Historical documentation and Git history were preserved. Existing browser or search caches may still show older previews; no new Google indexing request was made in this task.
