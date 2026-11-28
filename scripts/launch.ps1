$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Find-Node {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe')
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path $c)) { return $c }
  }
  $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

Write-Host 'YunYouQiLu - one-click launcher' -ForegroundColor Cyan
Write-Host ''

$node = Find-Node

if (-not $node) {
  Write-Host '[1/3] Node.js not found, installing Node.js 22 with winget (about 1 minute)...'
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    # --source winget avoids the "msstore" agreement prompt; --disable-interactivity stops any wait for input.
    & $winget.Source install --id OpenJS.NodeJS.LTS -e --source winget --silent --accept-source-agreements --accept-package-agreements --disable-interactivity
    Start-Sleep -Seconds 2
    $node = Find-Node
  }
  if (-not $node) {
    Write-Host ''
    Write-Host '[ERROR] Node.js is still not available.' -ForegroundColor Red
    Write-Host 'Install Node.js 22 from https://nodejs.org/zh-cn/download and double-click Start-Site.bat again.'
    Read-Host 'Press Enter to close'
    exit 1
  }
}

# Make npm and vite visible to child processes.
$env:PATH = (Split-Path -Parent $node) + ';' + $env:PATH
Write-Host "[1/3] Using Node.js at $node"
Write-Host ''

& $node (Join-Path $root 'scripts\serve-public.mjs') --no-tunnel
$code = $LASTEXITCODE

Write-Host ''
if ($code -eq 0) {
  Start-Process 'http://localhost:4173/'
  Write-Host 'Browser opened at http://localhost:4173/ - you can close this window.' -ForegroundColor Green
} else {
  Write-Host "[ERROR] Startup failed (exit code $code)." -ForegroundColor Red
  Write-Host 'Scroll up for the message above, or send a screenshot of this window to the developer.'
}

Read-Host 'Press Enter to close'
