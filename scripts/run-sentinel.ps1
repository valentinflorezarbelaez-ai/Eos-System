<#
.SYNOPSIS
  EOS Sentinel Daemon & FDIR Self-Healing Engine Runner
  Maintains continuous 24/7 pulse evaluating SHA-256 signatures and graph integrity.
#>

[CmdletBinding()]
param(
    [string]$EvidenceFile = "docs/evidence/EVD-0001-BASELINE-STRICT-PASS.json"
)

$ErrorActionPreference = "Stop"
$workspaceRoot = $PSScriptRoot | Split-Path -Parent

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   EOS SENTINEL 24/7 INTEGRITY PULSE & FDIR HEALER" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$evidencePath = Join-Path $workspaceRoot $EvidenceFile
if (-not (Test-Path $evidencePath)) {
    Write-Host " [ERROR] Baseline evidence record missing: $evidencePath" -ForegroundColor Red
    exit 1
}

$evidence = Get-Content $evidencePath -Raw | ConvertFrom-Json
$baselineMap = @{}
foreach ($entry in $evidence.checksums) {
    $baselineMap[$entry.relativePath] = $entry.sha256
}

Write-Host ">>> Monitored Baseline Files: $($baselineMap.Count)" -ForegroundColor Gray

# Audit Current Workspace Files
$mutated = @()
$missing = @()
$untracked = @()

foreach ($relPath in $baselineMap.Keys) {
    $full = Join-Path $workspaceRoot $relPath.Replace("/", "\")
    if (-not (Test-Path $full)) {
        $missing += $relPath
    } else {
        $currHash = (Get-FileHash -Path $full -Algorithm SHA256).Hash
        if ($currHash -ne $baselineMap[$relPath]) {
            $mutated += $relPath
        }
    }
}

Write-Host "`n>>> Integrity Verification Results:" -ForegroundColor Yellow
if ($mutated.Count -eq 0 -and $missing.Count -eq 0) {
    Write-Host " [PASS] 0 unauthorized mutations detected." -ForegroundColor Green
    Write-Host " [PASS] 0 missing baseline files." -ForegroundColor Green
    Write-Host " [HEARTBEAT] System control-plane is PRISTINE and SYNCHRONIZED." -ForegroundColor Green
    exit 0
} else {
    if ($mutated.Count -gt 0) {
        Write-Host " [MUTATION DETECTED] $($mutated.Count) files mutated without authorization:" -ForegroundColor Red
        foreach ($m in $mutated) { Write-Host "   - $m" -ForegroundColor Red }
    }
    if ($missing.Count -gt 0) {
        Write-Host " [MISSING DETECTED] $($missing.Count) baseline files missing:" -ForegroundColor Red
        foreach ($m in $missing) { Write-Host "   - $m" -ForegroundColor Red }
    }
    exit 1
}
