$ErrorActionPreference = 'Stop'

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw "ASSERTION FAILED: $Message" }
}

$root = Split-Path -Parent $PSScriptRoot
$makefile = Join-Path $root 'Makefile'
$launcher = Join-Path $PSScriptRoot 'project.ps1'

Assert-True (Test-Path -LiteralPath $makefile) 'Makefile must exist at repository root.'
Assert-True (Test-Path -LiteralPath $launcher) 'PowerShell launcher must exist under scripts/.'

$makeText = Get-Content -Raw -LiteralPath $makefile
foreach ($target in @('doctor', 'setup', 'run', 'first-run', 'infra-down')) {
    Assert-True ($makeText -match "(?m)^$target\s*:") "Make target '$target' is missing."
}

$launcherText = Get-Content -Raw -LiteralPath $launcher
foreach ($action in @('doctor', 'setup', 'run', 'first-run', 'infra-down')) {
    Assert-True ($launcherText -match [regex]::Escape("'$action'")) "Launcher action '$action' is missing."
}

Assert-True ($launcherText -match 'npm\.cmd') 'Launcher must use npm.cmd on Windows.'
Assert-True ($launcherText -match 'INSIGHTFACE_HOME') 'Launcher must validate INSIGHTFACE_HOME.'

Write-Output 'PASS: project setup launcher contract'
