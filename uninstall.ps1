# Cookie Bridge — Uninstall (restore original start.js)
$ErrorActionPreference = 'Stop'

$CC_DEFAULT = "C:\Program Files (x86)\Steam\steamapps\common\Cookie Clicker\resources\app"
if (Test-Path $CC_DEFAULT) { $CC_APP = $CC_DEFAULT }
else { $CC_APP = Read-Host "Enter path to resources\app" }

$ORIG = Join-Path $CC_APP "start.js"
$BAK  = Join-Path $CC_APP "start.js.original"

if (Test-Path $BAK) {
    Copy-Item $BAK $ORIG -Force
    Write-Host "[OK] Original start.js restored" -ForegroundColor Green
} else {
    Write-Host "[!] No backup found at $BAK" -ForegroundColor Yellow
}

$MOD_DEST = Join-Path $CC_APP "mods\local\mod_api"
if (Test-Path $MOD_DEST) {
    Remove-Item $MOD_DEST -Recurse -Force
    Write-Host "[OK] mod_api removed" -ForegroundColor Green
}

Write-Host "Uninstall complete. Restart Cookie Clicker." -ForegroundColor Cyan
Pause
