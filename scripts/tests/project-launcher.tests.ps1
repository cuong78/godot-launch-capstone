$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$launcher = Join-Path $projectRoot 'scripts\project.ps1'
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-Equal {
    param(
        [Parameter(Mandatory)] $Actual,
        [Parameter(Mandatory)] $Expected,
        [Parameter(Mandatory)] [string] $Message
    )

    if ($Actual -ne $Expected) {
        $failures.Add("$Message (expected: '$Expected', actual: '$Actual')")
    }
}

function Assert-Contains {
    param(
        [Parameter(Mandatory)] [string] $Actual,
        [Parameter(Mandatory)] [string] $Expected,
        [Parameter(Mandatory)] [string] $Message
    )

    if (-not $Actual.Contains($Expected)) {
        $failures.Add("$Message (missing: '$Expected')")
    }
}

Write-Host 'TEST: help explains the evaluator workflow'
$helpOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher help 2>&1 | Out-String
$helpExitCode = $LASTEXITCODE

Assert-Equal $helpExitCode 0 'Help must exit successfully'
Assert-Contains $helpOutput 'doctor' 'Help must list the prerequisite check'
Assert-Contains $helpOutput 'setup' 'Help must list dependency installation'
Assert-Contains $helpOutput 'run' 'Help must list project startup'
Assert-Contains $helpOutput 'first-run' 'Help must list the one-command first run'

Write-Host 'TEST: setup dry-run plans every dependency installation without executing it'
$setupOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher setup -DryRun 2>&1 | Out-String
$setupExitCode = $LASTEXITCODE

Assert-Equal $setupExitCode 0 'Setup dry-run must exit successfully'
Assert-Contains $setupOutput 'docker compose up -d' 'Setup must start Docker dependencies'
Assert-Contains $setupOutput 'npm.cmd ci' 'Setup must install locked frontend dependencies'
Assert-Contains $setupOutput 'mvnw.cmd dependency:go-offline' 'Setup must cache backend dependencies'
Assert-Contains $setupOutput 'python -m venv' 'Setup must create the AI virtual environment'
Assert-Contains $setupOutput 'download.pytorch.org/whl/cpu' 'Setup must install CPU-only PyTorch'
Assert-Contains $setupOutput 'requirements.txt' 'Setup must install AI requirements'
Assert-Contains $setupOutput 'preload_models' 'Setup must preload the ArcFace model'

Write-Host 'TEST: run dry-run plans all three local services'
$runOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher run -DryRun 2>&1 | Out-String
$runExitCode = $LASTEXITCODE

Assert-Equal $runExitCode 0 'Run dry-run must exit successfully'
Assert-Contains $runOutput 'http://localhost:3000' 'Run must start the frontend'
Assert-Contains $runOutput 'http://localhost:8080' 'Run must start the backend'
Assert-Contains $runOutput 'http://localhost:8001' 'Run must start the AI service'

Write-Host 'TEST: first-run dry-run seeds and uploads sample data after services start'
$firstRunOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher first-run -DryRun 2>&1 | Out-String
$firstRunExitCode = $LASTEXITCODE

Assert-Equal $firstRunExitCode 0 'First-run dry-run must exit successfully'
Assert-Contains $firstRunOutput 'Waiting for backend health' 'First-run must wait for Flyway migrations before loading sample data'
Assert-Contains $firstRunOutput 'backend\seed\run_all_seeds.ps1' 'First-run must execute the database seed script'
Assert-Contains $firstRunOutput 'run_all_seeds.ps1 -Force' 'First-run must bypass the seed confirmation prompt'
Assert-Contains $firstRunOutput 'upload_banner_images.ps1' 'First-run must upload banner images'
Assert-Contains $firstRunOutput 'upload_game_images.ps1' 'First-run must upload game and asset images'

Write-Host 'TEST: doctor accepts Java 21 output and reaches the Docker check'
$doctorOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher doctor 2>&1 | Out-String
Assert-Contains $doctorOutput 'Docker Desktop' 'Doctor must not treat the normal java --version output as an error'

Write-Host 'TEST: Makefile delegates setup and run targets to the Windows launcher'
$makeHelpOutput = & make.exe --no-print-directory help 2>&1 | Out-String
$makeHelpExitCode = $LASTEXITCODE
$makeSetupOutput = & make.exe --no-print-directory setup DRY_RUN=1 2>&1 | Out-String
$makeSetupExitCode = $LASTEXITCODE
$makeRunOutput = & make.exe --no-print-directory run DRY_RUN=1 2>&1 | Out-String
$makeRunExitCode = $LASTEXITCODE

Assert-Equal $makeHelpExitCode 0 'make help must exit successfully'
Assert-Contains $makeHelpOutput 'first-run' 'make help must expose the one-command workflow'
Assert-Equal $makeSetupExitCode 0 'make setup dry-run must exit successfully'
Assert-Contains $makeSetupOutput 'npm.cmd ci' 'make setup must delegate dependency installation'
Assert-Equal $makeRunExitCode 0 'make run dry-run must exit successfully'
Assert-Contains $makeRunOutput 'http://localhost:3000' 'make run must delegate project startup'

Write-Host 'TEST: PostgreSQL health check uses the configured Compose user'
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$composeJson = & docker.exe compose config --format json 2>$null | Out-String
$composeExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
Assert-Equal $composeExitCode 0 'Docker Compose configuration must be valid'
if ($composeExitCode -eq 0) {
    $compose = $composeJson | ConvertFrom-Json
    $postgresHealthCheck = $compose.services.postgres.healthcheck.test -join ' '
    Assert-Contains $postgresHealthCheck 'pg_isready -U user_godot_launch -d godot_launch' 'PostgreSQL must become healthy with its configured credentials'
}

if ($failures.Count -gt 0) {
    foreach ($failure in $failures) {
        Write-Error $failure
    }
    exit 1
}

Write-Host 'PASS: project launcher behavior'
