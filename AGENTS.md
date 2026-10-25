# SPOTIFY & NUBANK DUAL-ENGINE CONTEXT MATRIX: EOS-SYSTEM-CONTROL-PLANE
<!-- Generated programmatically by EOS Spotify Agentic Factory (SPEC-012 & SPEC-014) -->
<!-- DO NOT EDIT MANUALLY. Run 'eos xirp sync' to update. -->

## 1. Backstage Component Profile
- **Component ID**: `eos-system-control-plane`
- **Component Title**: EOS System (Engineering Operating System)
- **Owner Squad**: `user:valentin-florez-arbelaez`
- **Tribe**: `Core-Experience`
- **Lifecycle Tier**: `production`
- **Registered Fleet Repositories**: 4
- **Active Formal Architectural Specs (OpenSpec)**: 19

## 2. The 90 / 10 Architecture Doctrine
- **90% in Go (The Nervous System)**: High-concurrency microservices, idempotent event processors, CNCF health probes, FinOps distroless containers (< 12MB), and business APIs.
- **10% in Rust (The Heavy Motor)**: Lockless audio DSP kernels, ITU-R BS.1770 -14.0 LUFS loudness normalizers, and SIMD acoustic vector filters.

## 3. The 4 Fundamental Laws of Engineering & Perfection (Spotify & Nubank Standard)
1. **Principle of Extreme Ownership (Act Like an Owner)**:
   - Every line of code is written as if cloud server bills were paid from our own pocket. Zero temporary hacks.
2. **FinOps, Distroless & Zero-Allocation**:
   - Production Go services must compile to static stripped binaries (`-ldflags="-s -w"`) inside Distroless containers.
   - Critical path transactions must target 0 allocations (`0 B/op`) verified via `go test -bench=. -benchmem`.
3. **Shift-Left Rigor & Concurrency Safety**:
   - Code must pass data race detection (`go test -race ./...`) before deployment.
   - Formatting is strictly enforced via `gofmt -s -w .`.
4. **Event-Driven & Banking/Royalty Idempotency**:
   - All financial and streaming mutations must enforce idempotent deduplication tokens to guarantee zero duplicate charges or royalty allocations.

## 4. Inviolable Engineering Invariants
1. **Zero Vibe Coding**: All code changes must trace directly to formal EARS requirements in `openspec/specs/`.
2. **Layer-0 Purity**: Production modules must preserve zero external dependencies (`dependencies: {}`).
3. **Audio Standards**: LUFS normalization strictly targets **-14.0 LUFS** with a **-1.0 dBTP** true peak ceiling.
4. **Asynchronous Communication**: Cross-squad contracts (Stockholm/London/NYC/Bogotá) must be documented in code comments and Backstage catalogs.
5. **No Plaintext Secrets**: Hardcoded credentials result in immediate CI/CD rejection.
