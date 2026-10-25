$ErrorActionPreference = "Stop"
$node = "C:\Users\valen\AppData\Local\nvm\v24.19.0\node.exe"
$files = Get-ChildItem -Path "C:\Users\valen\Aberamentho-s-Pleroma-music\src" -Filter *.js -Recurse
foreach ($f in $files) {
    & $node --check $f.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Syntax error in $($f.FullName)"
        exit 1
    }
    Write-Host "OK: $($f.Name)"
}
Write-Host "ALL JAVASCRIPT FILES PASS SYNTAX CHECK DETERMINISTICALLY."
