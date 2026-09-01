# Mirror a GitHub repository

Origin is currently released in early beta. You can create repos, push and pull with git, mirror from GitHub, browse and search code, open and merge pull requests, and share with your Cursor team.

Mirroring copies a GitHub repository into Origin and keeps Origin updated as the GitHub repo changes.

## Sync a repo

Open cursor.com/codebase, select Sync from GitHub, choose the GitHub organization and repository, then confirm the sync.

## What syncs

Pull requests on a mirrored repo work on Origin and sync back to GitHub. Issues and CI configuration stay on GitHub unless you rebuild them elsewhere.

## After you mirror

Pushes to a synced repo pass through to GitHub, which remains the source of truth.

## Detach from GitHub

To stop syncing, open Settings and select Detach from GitHub. This stops the sync and converts the Origin copy into a standalone Origin-hosted repository: Origin becomes the source of truth, and pushes to the Origin remote no longer flow to GitHub.

## When not to mirror

If you only want automated review comments on GitHub PRs, Cursor Review and Bugbot do that without moving storage.

## Related

- [Pull requests](https://cursor.com/docs/origin/pull-requests.md)

## Sitemap

[Overview of all docs pages](/llms.txt)
