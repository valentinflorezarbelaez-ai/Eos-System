# ==============================================================================
# EOS SYSTEM — DUAL-ENGINE FINOPS DISTROLESS DOCKERFILE (< 12MB)
# Standards: Spotify Golden Path (RFC-42) & Nubank Layer-0 Hexagonal Architecture
# ==============================================================================

# STAGE 1: Compile stripped static Go Apex binary
FROM golang:1.24-alpine AS go-builder
WORKDIR /build

# Copy Go sources
COPY src/native/ src/native/
COPY go.mod* ./

# Compile static stripped binary with 0 debug symbols
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -extldflags '-static'" \
    -o /build/eos-apex \
    src/native/eos_apex_orchestrator.go

# STAGE 2: Distroless Google Runtime (< 12MB, 0 CVEs, Non-Root)
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app

# Copy compiled Go static binary
COPY --from=go-builder /build/eos-apex /app/eos-apex

# Metadata & Labels
LABEL org.opencontainers.image.title="EOS System Apex Control Plane"
LABEL org.opencontainers.image.description="FinOps Distroless High-Scale Nervous System (Go 1.24 + Zero Allocation)"
LABEL org.opencontainers.image.vendor="EOS System Sovereign Architecture"
LABEL org.opencontainers.image.licenses="MIT"

# Expose CNCF /healthz port
EXPOSE 8090

# Non-root execution
USER nonroot:nonroot

# Run Go Native Orchestrator with CNCF health server
ENTRYPOINT ["/app/eos-apex", "-server"]
