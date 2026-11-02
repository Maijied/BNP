# BNP Cloudflare Pages CI/CD

## Purpose
Publish the **main** branch static Next.js export (`out/`) and Cloudflare Pages Functions through GitHub Actions. Draft feature branches and unmerged payment work are **not** published by this workflow.

## One-time GitHub setup
1. Confirm that the existing Cloudflare Pages project is the one serving `bnp.lorapok.tech` and that its production branch is `main`.
2. In GitHub repository Settings > Environments, create a `production` environment (consider required reviewers).
3. In that environment, add secrets `CLOUDFLARE_API_TOKEN` (scoped to Cloudflare Pages edit permission for the intended account) and `CLOUDFLARE_ACCOUNT_ID`.
4. Add environment variable `CLOUDFLARE_PAGES_PROJECT` containing the **actual** Cloudflare Pages project name, not the domain. Do not guess the project name.
5. Verify Cloudflare Pages build output is `out`. Avoid having both a Cloudflare Git integration and GitHub Actions independently publish different branches to the same production environment.

## Release
Merge the CI workflow PR to `main` only after confirming project and environment settings. A push to `main` then runs `npm ci`, `npm run build` and `wrangler pages deploy out`. Use Actions > Deploy BNP storefront to Cloudflare Pages > Run workflow to redeploy the current main commit.

## Verify
- GitHub Actions run succeeded and reports the intended commit SHA.
- Cloudflare Pages deployment shows that same commit and the correct project/domain.
- Load `https://bnp.lorapok.tech/` in a private browser tab; verify homepage, assets and navigation.
- Verify no payment flow is activated until D1 binding, migrations, bridge secrets, signature contract and authenticated webhook are ready.

## Security
Do not add Cloudflare API tokens to source files or pull-request comments. Do not merge draft payment PRs to force a visual website update. This workflow alone does not configure D1 or LoraHost.
