$ErrorActionPreference = 'Stop'
$extRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$distDir = Join-Path $extRoot 'dist'
$backendCrx = Join-Path $extRoot '..\sss-backend\extensions\sss-extension.crx'

npm --prefix $extRoot run build
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --pack-extension="$distDir" --pack-extension-key="$extRoot\extension-key.pem"
$crx = Get-ChildItem "$extRoot\*.crx" | Sort-Object LastWriteTime -Desc | Select-Object -First 1
if (-not $crx) { throw 'CRX not found (Chrome pack failed).' }
Move-Item $crx.FullName $backendCrx -Force
