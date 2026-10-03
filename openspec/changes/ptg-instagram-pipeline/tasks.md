# Tasks — PTG Instagram pipeline

## 1. Confirm there is no pipeline spec to update

- [x] Search the repo for an Instagram / caption pipeline. None found. Website intake left unchanged.

## 2. Write the spec

- [x] `proposal.md`, `design.md`, `tasks.md`, `specs/instagram-pipeline/spec.md`.
- [x] Every biography and roster figure marked `USER_ASSERTED`.
- [x] Alpha and Beta described as intents. No token template invented.
- [x] Minor-athlete personal data forbidden.
- [x] Explicit non-goals: no homepage, no kernel, no API client, no auto-post.

## 3. Keep it out of the public site

- [x] `site/index.html` test asserts the page does not name this pipeline.

No implementation task. A publisher module would be a later change with its own failing test and a source file for any number it prints.
