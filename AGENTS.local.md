# Local fork workflow

These rules describe the `amirsalaar/9router` fork workflow. Check live branch and PR state before acting; the PR notes below are a snapshot from September 29, 2026.

## Branch roles

- `decolua/9router:master` is the upstream source. Keep `amirsalaar/9router:master` as the upstream-sync branch whose only fork-specific content is this `AGENTS.local.md`. Merge upstream `master` into it as upstream advances; do not merge fork features into it.
- `chore/amirsalaar/fork-local` is the only long-lived local trunk for fork work. Merge ready fork work here even when upstream review has no known completion date. Do not rebase or force-push this shared branch.
- Merge the refreshed fork `master` into `fork-local` regularly and resolve conflicts there. Never merge `fork-local` into fork `master`.
- Fork integration PRs target `chore/amirsalaar/fork-local` explicitly; the fork's default branch is still `master`. Do not create or use a separate branch named `trunk` for integration.
- Upstream contribution PRs start directly from `decolua/9router:master`, not fork `master`, so this fork-only file stays out of them. Target `decolua/9router:master`, keep each PR focused on one independent change, and never base it on, or merge in, `fork-local`.
- If an upstream change depends on another pending change, show that dependency with a stacked PR instead of pulling in the entire local trunk.

## Keeping both paths current

- Treat `fork-local` integration and upstream acceptance as separate milestones. A merge into the fork does not deliver a change to upstream.
- Port review fixes made on upstream PR branches into `fork-local`. When upstream accepts a PR, merge upstream `master` into fork `master`, then merge fork `master` into `fork-local` and reconcile any differences with the locally integrated version.
- Save a backup ref before rewriting a published PR branch, especially when the same head is used by a fork PR and an upstream PR.
- Run focused tests, the repository's baseline checks, and a build for affected code before promoting it. Regenerate the provider registry and provider baselines when resolving conflicts in generated files.

## Current PR transition

- Fork PRs `#1`, `#2`, `#3`, `#5`, and `#6` are integrated into `fork-local`.
- Fork PR `amirsalaar/9router#8` was mistakenly squash-merged into fork `master`. Fork `master` was restored to upstream `master` before adding this file, and the Responses change was ported to `fork-local` as `aece632c` from `b0aa19fc`. The temporary branch named `trunk` was deleted. GitHub's historical PR record still names `master` as the merge target.
- Upstream PR `decolua/9router#4157` now contains only the Kiro EventStream extraction and Bedrock work. The original published head is backed up as `codex/backup-pr1-0ec123f5`. The Bedrock branch includes AWS session-token redaction and bounded connection waits; live AWS validation has not been rerun since the split.
- The other open upstream PRs are `#4472` (Responses tools and stream integrity, same tree as fork PR `#8`), `#4474` (Copilot routing), `#4475` (Azure Responses), `#4476` (Responses usage), `#4477` (in-band stream errors), `#4478` (context limits), and `#4479` (CLI `esbuild`). All target upstream `master` from focused fork branches.
- Upstream PRs `#4472`, `#4476`, and `#4477` are individually mergeable but conflict with each other in `open-sse/translator/response/openai-responses.js` when combined. After one lands, refresh the remaining PR branches from `decolua/9router:master`, resolve that file there, and port review fixes into `fork-local`. The current combined `fork-local` is a tested reference for their behavior.
