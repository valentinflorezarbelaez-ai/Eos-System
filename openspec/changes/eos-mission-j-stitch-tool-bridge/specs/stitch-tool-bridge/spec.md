# Spec — stitch-tool-bridge

## Requirement: Tool surface
The bridge SHALL expose list projects, generate screen, get screen, and export designMd operations.

## Requirement: Device enum
generate screen SHALL accept only DESKTOP or MOBILE.

## Requirement: Bounds
Prompt inputs SHALL reject UTF-8 payloads exceeding 2MiB. Calls SHALL timeout within 30s by default.

## Requirement: Custody
Successful calls SHALL attach custody with tool, input_hash (SHA-256), duration_ms, status VERIFIED.

## Requirement: Hermetic CI
Default tests SHALL inject clientImpl and SHALL NOT require live network. Live tests opt-in via RUN_LIVE_STITCH_TESTS=true.
