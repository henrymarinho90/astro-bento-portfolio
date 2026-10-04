# CMS publication

This Astro portfolio is prerendered. Directus content becomes public only after a successful Coolify build and deployment.

- Collection: `projects`; public content requires `status = published`.
- Homepage: the three newest published projects, sorted by descending creation date and ID.
- `/project/`, individual project routes, and `/rss.xml`: all published projects.
- CMS/network/malformed-response failures stop the build; do not catch them and publish an empty site.
- Directus flow `Trigger Coolify Build`: asynchronous `items.create`, `items.update`, and `items.delete` events, restricted to `projects`. Updates include unpublishing or changing a slug, so rebuilding must not be restricted only to newly published rows.
- Its HTTP operation calls the existing portfolio application's Coolify deployment endpoint using an Authorization header. The dedicated token has only `deploy` permission. Coolify scopes it to the team, not a single application. Never commit the token or place it in public Astro variables.
- Saving draft changes can also trigger a build. Check Coolify deployment history if publication does not appear; a CMS save alone does not prove deployment succeeded.

## Verification

```sh
npx pnpm@9 install --frozen-lockfile
npm test
npm run build
```

The Node adapter is pinned to 9.5.1 to retain compatibility with the current locked Astro version. Upgrade Astro and its adapter together in a separate tested change.

After deployment, compare the homepage, `/project/`, article URLs, and `/rss.xml` to the published Directus records. Test the event integration by saving an existing project's unchanged title; this preserves displayed content but updates its CMS audit history/update timestamp. Confirm a new deployment appears and finishes successfully.

## Failure handling

- Frozen-lockfile mismatch: regenerate the lockfile deliberately, test, and commit it with the manifest; do not disable the frozen check as a permanent workaround.
- GitHub timeout: check server connectivity and the deployment log, then retry the failed deployment.
- CMS timeout or malformed response: restore CMS reachability and retry; the previous deployed version should remain available.
- Authorization failure: rotate/reconfigure the dedicated deployment token in the private Directus operation; never use a root token.
- For code rollback, revert the publication-fix commit and redeploy, or use Coolify's prior image if retained. Back up flow configuration/database before changing automation.
