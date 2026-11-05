# Remaining tasks and acceptance gates

## 1. Deliver the separate review branch

- Publish all completed code/assets and this folder to one separate branch after the pending GitHub authorization/access path permits it.
- Verify the resulting remote branch commit and included file tree. Review differences against remote `main` baseline `8d08831be185c8dabe5dc72a5b8c36780ff16265`; reconcile deliberately rather than overwriting remote changes.
- Preserve the existing main branch and live deployment. Do not merge or trigger production deployment. Report branch URL and exact commit only once verified.
- Run applicable branch checks. The existing quality workflow is triggered by pull requests, main pushes or manual dispatch; a plain feature-branch push is not evidence that CI ran.

## 2. Complete integrated UI acceptance

- Review BNP and Vespa at desktop and narrow mobile widths against the user-supplied reference direction and original images.
- Verify Vespa Light/Dark controls, original-photo depth framing, touch behavior, no horizontal overflow and stable entered customization/review/pending state across repeated switches.
- Verify BNP stage navigation, actual focus/keyboard behavior, bilingual guidance, sticky summary, pending/retry interruption paths and private receipt refresh.
- Exercise reduced motion and Pause motion, video loading/error/autoplay behavior, replay controls and screen-reader labels.
- The latest shared-browser review was paused; no final visual/browser acceptance is claimed. Source/hook tests are not a substitute.

## 3. Provision the backend only after explicit authorization

- Inspect the actual account/project/environment, existing databases/bindings/data and rollback plan.
- Select distinct approved parent/auth/courier databases; apply only the correct migrations to identified targets. Receipt throttling needs migration `0006` on the Pages/auth DB.
- Deploy the parent service to its approved private destination, configure server-only scoped credentials, register each application/environment and bind Pages to it.
- Configure Pages admin using `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`; legacy `ADMIN_DEFAULT_*` seed values do not configure Pages login.
- Obtain approved real catalog/specification/shipping data. Do not promote synthetic catalog data or sample requests to production.
- Follow `docs/BACKEND_PROVISIONING.md` and verify fail-closed behavior before any separately authorized intake changes.

## 4. Resolve product/admin and domain decisions

- Confirm final Vespa/BNP/BNP.live domain mapping and whether catalogs, orders and admin identity are shared or separate. No automatic redirect is assumed.
- User-reported BNP.live/Hostinger ownership does not verify DNS records. Inspect records first; preserve unrelated website, mail and verification records. No DNS mutation is included in this branch handoff.
- Parent-wide multi-client admin, delegated admin identity and the separate Lorapok-wide login experience remain unimplemented. Keep tenant credentials scoped rather than broadening a BNP key.
- Confirm brand/mascot choices, physical plate materials/fitment/mounting, real prices and legal/road-use claims before publication.

## 5. Keep transaction and provider gates closed

- Payment capture, verified settlement, production/QC and paid dispatch are deferred. Parent requests cannot become dispatched merely by changing legacy flags.
- No real Pathao token/store/provider sandbox acceptance or complete webhook/rewards evidence has been established.
- Private unpaid receipt status is not customer courier tracking. Real tracking needs an authorized ownership binding and confirmed consignment.
- Do not create a real customer order, payment, shipment or provider booking as a smoke test. Any future infrastructure, credential, legal or transaction action requires its own applicable authorization.
