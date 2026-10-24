<#
.SYNOPSIS
  EOS Administrative Baseline Signing Ceremony (PRIVILEGED / OUT-OF-BAND)
  This tool is run ONLY by the Human Architect / Key Custodian to notarize an approved baseline.
  It is STRICTLY PROHIBITED from being invoked by verify-strict.ps1.
#>

[CmdletBinding()]
param(
    [string]$KeyDir = ".eos/trust",
    [string]$KeyId = "eos-root-ecdsa-p256-key-01"
)

$ErrorActionPreference = "Stop"
$workspaceRoot = $PSScriptRoot | Split-Path -Parent | Split-Path -Parent
$targetTrustDir = Join-Path $workspaceRoot $KeyDir

if (-not (Test-Path $targetTrustDir)) {
    New-Item -Path $targetTrustDir -ItemType Directory -Force | Out-Null
}

$privateKeyFile = Join-Path $targetTrustDir "root_privkey.xml"
$publicKeyFile = Join-Path $targetTrustDir "root_pubkey.xml"
$baselineFile = Join-Path $targetTrustDir "baseline.signed.json"

Write-Host ">>> Initializing ECDsa P-256 Cryptographic Key Pair..." -ForegroundColor Cyan

$cngParams = [System.Security.Cryptography.CngKeyCreationParameters]::new()
$cngParams.ExportPolicy = [System.Security.Cryptography.CngExportPolicies]::AllowPlaintextExport

# Generate or load existing key pair
$dsa = [System.Security.Cryptography.ECDsaCng]::new(256)
$privXml = $dsa.ToXmlString([System.Security.Cryptography.ECKeyXmlFormat]::Rfc4059)
$pubXml = $dsa.ToXmlString([System.Security.Cryptography.ECKeyXmlFormat]::Rfc4059) # public only representation in standard format

# Save public key for repository distribution
Set-Content -Path $publicKeyFile -Value $pubXml -Encoding UTF8
Set-Content -Path $privateKeyFile -Value $privXml -Encoding UTF8

Write-Host ">>> Public Key written to: $publicKeyFile" -ForegroundColor Green

# Calculate SHA-256 digests of all tracked workspace files
Write-Host ">>> Computing SHA-256 digests across workspace..." -ForegroundColor Yellow

$trackedFiles = Get-ChildItem -Path $workspaceRoot -Recurse -File | Where-Object {
    $_.FullName -notmatch "\\\.git\\" -and
    $_.FullName -notmatch "\\dist\\" -and
    $_.FullName -notmatch "\\\.eos\\trust\\" -and
    $_.FullName -notmatch "\\docs\\evidence\\"
}

$fileEntries = @()
foreach ($file in $trackedFiles) {
    $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
    $rel = $file.FullName.Substring($workspaceRoot.Length + 1).Replace("\", "/")
    $fileEntries += [PSCustomObject]@{
        relativePath = $rel
        sha256       = $hash
        sizeBytes    = $file.Length
    }
}

Write-Host ">>> Tracked files indexed: $($fileEntries.Count)" -ForegroundColor Gray

# Create canonical baseline payload
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$gitCommit = (git rev-parse HEAD 2>$null)
if (-not $gitCommit) { $gitCommit = "INITIAL_UNCOMMITTED" }

$manifest = [PSCustomObject]@{
    manifestVersion = "1.0.0"
    keyId           = $KeyId
    signedCommit    = $gitCommit.Trim()
    timestamp       = $timestamp
    files           = $fileEntries
}

$canonicalJson = $manifest | ConvertTo-Json -Depth 6 -Compress
$bytesToSign = [System.Text.Encoding]::UTF8.GetBytes($canonicalJson)
$signatureBytes = $dsa.SignData($bytesToSign, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
$signatureHex = [System.BitConverter]::ToString($signatureBytes).Replace("-", "").ToLower()

$signedManifest = [PSCustomObject]@{
    manifestVersion = "1.0.0"
    keyId           = $KeyId
    signedCommit    = $gitCommit.Trim()
    timestamp       = $timestamp
    files           = $fileEntries
    signatureHex    = $signatureHex
    canonicalHash   = (Get-FileHash -InputStream ([System.IO.MemoryStream]::new($bytesToSign)) -Algorithm SHA256).Hash
}

$signedJson = $signedManifest | ConvertTo-Json -Depth 6
Set-Content -Path $baselineFile -Value $signedJson -Encoding UTF8

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] BASELINE SIGNED AND SEALED" -ForegroundColor Green
Write-Host " Baseline Manifest: $baselineFile" -ForegroundColor Cyan
Write-Host " Digital Signature (ECDSA P-256): $signatureHex" -ForegroundColor Cyan
Write-Host " Total Files Signed: $($fileEntries.Count)" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Green
