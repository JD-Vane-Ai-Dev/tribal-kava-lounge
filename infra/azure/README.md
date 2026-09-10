# Azure daily publisher

The scheduled Daily Kava draft job runs in Azure Container Apps at 11:00 UTC.
It clones this public repository, runs the original-manuscript draft/compliance
pipeline, and pushes only `daily-engine/state/` and `daily-engine/drafts/` back
to `master`. Its existing schedule, image, and draft-only repository write scope
stay unchanged.

Those pushes trigger the repository's **Publish Passing Kava Drafts** workflow.
It rechecks the exact draft, holds flagged content, tests and stages passing
posts, then deploys the existing `tribal-kava-lounge-site` Azure Static Web App.
Only after production serves the exact staged catalog does it record publication
in the queue. There is no per-post approval for passing content.

The workflow requires the repository Actions secret
`AZURE_STATIC_WEB_APPS_API_TOKEN` for this existing Static Web App. It uses
`Azure/static-web-apps-deploy` with the tested `dist/` site and existing `api/`.
Missing credentials, deployment failures, or live-verification failures stop the
workflow visibly and leave staged state available for retry. No failed deployment
is recorded as a successful publication.

Security boundaries:

- The Azure resource group is dedicated to Tribal Kava automation.
- A repository-specific GitHub deploy key has write access only to this repo.
- The private key is held in Azure Key Vault and exposed to the job through a
  managed identity; the ACR admin account is disabled.
- The container pins GitHub's current SSH public host keys and refuses unknown
  hosts.
- The optional Azure writer prefers the job's managed identity for model access;
  an explicitly authorized resource key can instead use encrypted job-secret
  storage with `AZURE_OPENAI_AUTH_MODE=api_key`.
  The draft container does not receive the site's deployment token. Deployment
  stays in the existing GitHub publishing workflow. Writer setup, activation
  status, source requirements and usage limits are in `daily-engine/WRITER.md`.

**Manual Kava Draft Fallback** remains available without a GitHub schedule. Its
successful completion starts the publisher through `workflow_run`, because its
`GITHUB_TOKEN` commit does not trigger another push workflow. Publishing accepts
only the current repository's `master` branch and successful trusted fallback
runs; it never executes pull-request artifacts. The fallback and publisher use
one production concurrency group without cancelling in-flight work.

Held reasons are stored in `daily-engine/state/queue.json`; edit and commit a
corrected draft to recheck it. For deployment recovery, rerun **Publish Passing
Kava Drafts** on `master` with an optional draft filename. Non-fast-forward pushes
fail visibly; no queue conflicts are force-pushed or silently resolved. See
`daily-engine/README.md` for the stage, verify, and finalize commands.

## Conversion dashboard

`conversion-workbook.bicep` deploys the shared **Tribal Kava Conversion
Dashboard** against `tribal-kava-insights` in `tribal-kava-site-rg`.
The workbook reports:

- visits, menu sessions, directions/calls, and DoorDash checkout starts;
- conversion actions and unique sessions;
- Google, Instagram, QR, direct, and other UTM sources;
- drink-finder recommendations.

Local previews never initialize browser telemetry. Controlled validation uses
`utm_medium=qa`, which every workbook query excludes. `begin_checkout` means
the visitor opened Tribal's DoorDash checkout path; DoorDash does not expose a
completed-purchase event to this site.

Validate all five KQL queries before deployment, then update the workbook with:

```sh
az deployment group create \
  --resource-group tribal-kava-site-rg \
  --template-file infra/azure/conversion-workbook.bicep
```
