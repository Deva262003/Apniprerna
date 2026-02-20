# Build script for SSS Chrome Extension (Windows)
# Creates a signed CRX file for distribution

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$KeyFile = Join-Path $ScriptDir "extension-key.pem"
$OutputDir = Join-Path $ScriptDir "dist"
$BackendExtDir = Join-Path $ScriptDir "..\sss-backend\extensions"
$PackDir = $OutputDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SSS Extension Build Script (Windows)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get version from manifest
$manifest = Get-Content (Join-Path $ScriptDir "manifest.json") | ConvertFrom-Json
$Version = $manifest.version
Write-Host "Building version: $Version" -ForegroundColor Green
Write-Host ""

# Create output directory
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Find Chrome
$ChromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$ChromeBin = $null
foreach ($path in $ChromePaths) {
    if (Test-Path $path) {
        $ChromeBin = $path
        break
    }
}

if (!$ChromeBin) {
    Write-Host "Chrome not found! Please install Chrome." -ForegroundColor Red
    exit 1
}

Write-Host "Using: $ChromeBin"

Write-Host "Running Vite build..." -ForegroundColor Cyan
Push-Location $ScriptDir
npm run build
Pop-Location

# Build CRX
$parentDir = Split-Path -Parent $ScriptDir
$crxOutput = "$PackDir.crx"
$pemOutput = "$PackDir.pem"

if (!(Test-Path $PackDir)) {
    Write-Host "Build output not found at $PackDir" -ForegroundColor Red
    exit 1
}


if (Test-Path $KeyFile) {
    Write-Host "Using existing key: $KeyFile"
    & $ChromeBin --pack-extension="$PackDir" --pack-extension-key="$KeyFile" 2>$null
} else {
    Write-Host "No key found, generating new one..." -ForegroundColor Yellow
    & $ChromeBin --pack-extension="$PackDir" 2>$null

    # Move generated key
    if (Test-Path $pemOutput) {
        Move-Item $pemOutput $KeyFile -Force
        Write-Host "Key saved to: $KeyFile" -ForegroundColor Green
        Write-Host "IMPORTANT: Keep this file safe! You need it for future updates." -ForegroundColor Yellow
    }
}

# Wait a moment for file to be created
Start-Sleep -Seconds 2

# Move CRX to output directory
if (Test-Path $crxOutput) {
    $versionedCrx = Join-Path $OutputDir "sss-extension-v$Version.crx"
    $latestCrx = Join-Path $OutputDir "sss-extension.crx"
    $backendVersionedCrx = Join-Path $BackendExtDir "sss-extension-$Version.crx"

    Move-Item $crxOutput $versionedCrx -Force
    Copy-Item $versionedCrx $latestCrx -Force
    Write-Host "CRX created: $versionedCrx" -ForegroundColor Green

    # Copy to backend if exists
    if (Test-Path $BackendExtDir) {
        Copy-Item $latestCrx (Join-Path $BackendExtDir "sss-extension.crx") -Force
        Copy-Item $versionedCrx $backendVersionedCrx -Force
        Write-Host "Copied to backend: $BackendExtDir\sss-extension.crx" -ForegroundColor Green
        Write-Host "Copied to backend: $BackendExtDir\sss-extension-$Version.crx" -ForegroundColor Green
    }
} else {
    Write-Host "Error: CRX file not created at $crxOutput" -ForegroundColor Red
    Write-Host "This may happen if Chrome window is open. Close Chrome and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output files:"
Write-Host "  - $OutputDir\sss-extension-v$Version.crx"
Write-Host "  - $OutputDir\sss-extension.crx (latest)"
Write-Host ""
Write-Host "Extension version: $Version"
