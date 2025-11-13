## Supabase Adoption Roadmap

This roadmap outlines the steps required to establish Supabase as the unified data and auth layer across every Cryptopulse surface.

### Phase 1 — Supabase Foundations
- Provision the Supabase project and enable email/password authentication.
- Generate environment credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`).
- Store credentials in Northflank secrets, GitHub Actions, and local `.env` files.
- Document security posture, quotas, and rotation procedures.

### Phase 2 — Backend Authentication
- Implement Supabase JWT verification for protected routes.
- Introduce `/api/auth/supabase-login` to exchange Supabase access tokens for Cryptopulse sessions.
- Update environment validation logic, Redis session handling, and automated tests.
- Simplify notification storage to align with Supabase setup.

### Phase 3 — Web Dashboard Alignment
- Build the dashboard auth flows on top of the Supabase client (`@supabase/supabase-js`).
- Rebuild registration/login UI to support email/password with client-side validation.
- Wire Supabase sessions to the backend exchange endpoint.
- Refresh documentation and environment examples for front-end contributors.

### Phase 4 — Android App Refactor
- Synchronize Gradle modules with the Supabase REST auth flow (sign-up + password grant).
- Rework registration UI to the email/password model with confirm-password checks.
- Persist session data in `PreferenceManager` and route notifications through the in-app channel.

### Phase 5 — Repository Hardening
- Delete superseded service files, credentials, and build artefacts from all modules.
- Purge obsolete references from scripts, documentation, and CI definitions.
- Update cost breakdown, deployment guides, and release documentation to reflect Supabase usage.
- Perform repository-wide scans to confirm only Supabase auth/storage utilities remain.

### Phase 6 — Regression & Deployment
- Run the full automated test suite (unit, integration, E2E) with Supabase credentials.
- Execute manual QA for backend, web dashboard, and Android app experiences.
- Validate Northflank deployments and runtime environments with new variables.
- Prepare rollout communication and rollback procedures, then deploy.

Each phase concludes with review checkpoints and documentation updates to keep the team aligned while Supabase becomes the primary platform.


