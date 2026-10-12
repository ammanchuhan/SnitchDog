# Contributing

## Branches

SnitchDog follows git-flow.

| Branch | What it holds |
|---|---|
| `main` | Released versions only. Every commit on `main` is a release, tagged `vX.Y.Z`. |
| `develop` | The integration branch. Features land here once they're done and tested. |
| `feature/*` | One feature each, branched from `develop`, merged back with `--no-ff`. |
| `fix/*` | A bug fix, same as a feature. |
| `chore/*`, `docs/*`, `test/*` | Tooling, documentation and tests that aren't a feature. |
| `hotfix/*` | An urgent fix to a release: branched from `main`, merged into `main` and `develop`. |

A release is `develop` merged into `main` with `--no-ff`, then tagged. `main` and `develop`
are protected: changes arrive by pull request.

## Commits

- One logical change per commit, in the imperative, the way you'd describe it to a person:
  "Add password reset by emailed code", not "fixes" or "update stuff".
- The subject says what changed; the body, when there is one, says why.
- A commit builds and passes its tests on its own.
- Requirement ids from the requirements doc (HOME-3, Q20) go in code comments, not subjects.

## Before opening a pull request

```bash
npx tsc --noEmit                     # app types
cd server && npx tsc --noEmit && npm test
node --env-file=.env.local scripts/smoke.mjs    # against a running server
sh e2e/run.sh                        # on a simulator, for anything the app shows
```

Schema changes go in `server/scripts/schema.sql` and stay additive until the first release is
out of beta; run `npm run migrate` in `server/`.
