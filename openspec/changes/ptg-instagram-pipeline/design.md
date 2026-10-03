# Design — PTG Instagram pipeline

## Boundary

This change is markdown under `openspec/changes/ptg-instagram-pipeline/`. No runtime module. No site section. No kernel import.

The existing registration `docs/projects/registrations/performance-talent.json` points at an external path and status `NOT_STARTED` for specification of the website. This pipeline does not flip those fields. Doing so would claim an authorization this slice does not have.

## Epistemic rule

A fact is `USER_ASSERTED` when the operator stated it and no file in this repository is the source. A fact becomes eligible to leave that label only when a source file is added and cited. This design does not add that source file.

Roster numbers stay `USER_ASSERTED` in the spec even if a later caption wants them. Captions must not present them as measured by EOS.

## Patterns

Pattern Alpha and Pattern Beta are editorial intents, not template languages:

- Alpha — legal and financial register. Name the institution, the license or registry, and the role. No praise adjectives.
- Beta — biomechanical or quantitative register. A number appears only with its unit and its `USER_ASSERTED` or source label. No ranking language.

Because no token template exists in the repo, this design forbids strings such as `{{athlete}}` until a human commits a source template. Agents must not invent one to “fill the gap”.

## Media

Normative bounds for assets an operator might later hand to a publisher. They are requirements, not a claim that an encoder was run:

- Video: 9:16, 1080×1920, H.264, VBR, 2-pass, 15–20 Mbps, AAC 320 kbps, 48 kHz.
- Stills and carousels: 4:5, 1080×1350 only. 1:1 is out of contract.
- Hashtags: 3 to 5.

## Minors

Do not publish personal data of minor athletes. Age, school, home, contact, guardian, or license-to-represent details that identify a minor stay out of captions, carousels, and alt text. The operator assertion that a person is “authorized for minors” is not permission to publish a minor’s data.

## Copy

Reject hype and ego. Captions stay short. If a sentence is praise without a source, it is out of contract.
