[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'doctor', 'setup', 'run', 'first-run', 'infra-up', 'infra-down')]
    [string] $Action = 'help',
    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$frontendRoot = Join-Path $projectRoot 'frontend'
$backendRoot = Join-Path $projectRoot 'backend'
$aiRoot = Join-Path $projectRoot 'ai-service'
$serviceLauncher = Join-Path $PSScriptRoot 'start-service.ps1'

function Show-Help {
    @'
GodotLaunch local launcher (Windows)

Usage:
  powershell -ExecutionPolicy Bypass -File .\scripts\project.ps1 <action>

Actions:
  doctor      Check required tools, environment files, and Docker Desktop.
  setup       Start containers and install frontend, backend, and AI dependencies.
  run         Start containers, backend, frontend, and AI service.
  first-run   Setup, start the project, then load development seed data and images.
  infra-up    Start Docker Compose dependencies only.
  infra-down  Stop Docker Compose dependencies without deleting data.
  help        Show this help.

Add -DryRun to setup or run to print commands without executing them.
'@ | Write-Host
}

function Write-Step {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-ProjectCommand {
    param(
        [Parameter(Mandatory)][string] $WorkingDirectory,
        [Parameter(Mandatory)][string] $Executable,
        [Parameter(Mandatory)][string[]] $Arguments,
        [Parameter(Mandatory)][string] $DisplayCommand
    )

    if ($DryRun) {
        Write-Host "[DRY-RUN] $DisplayCommand"
        return
    }

    Push-Location $WorkingDirectory
    try {
        & $Executable @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $DisplayCommand"
        }
    }
    finally {
        Pop-Location
    }
}

function Get-DotEnvValue {
    param([string] $Path, [string] $Name)
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.*)\s*$") {
            return $matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return $null
}

function Get-RequiredCommand {
    param([string[]] $Names, [string] $InstallHint)
    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    throw "Missing command '$($Names -join ' / ')'. $InstallHint"
}

function Assert-EnvironmentFiles {
    foreach ($file in @((Join-Path $backendRoot '.env'), (Join-Path $frontendRoot '.env'), (Join-Path $aiRoot '.env'))) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Missing environment file: $file"
        }
    }

    $aiEnv = Join-Path $aiRoot '.env'
    $insightfaceHome = Get-DotEnvValue -Path $aiEnv -Name 'INSIGHTFACE_HOME'
    if ([string]::IsNullOrWhiteSpace($insightfaceHome)) {
        throw "INSIGHTFACE_HOME is missing from $aiEnv"
    }

    $expectedInsightfaceHome = (Join-Path $env:USERPROFILE '.cache\insightface').Replace('\', '/').TrimEnd('/')
    $normalizedInsightfaceHome = $insightfaceHome.Replace('\', '/').TrimEnd('/')
    if ($normalizedInsightfaceHome -ine $expectedInsightfaceHome) {
        throw "Update INSIGHTFACE_HOME in ai-service\.env. Expected: INSIGHTFACE_HOME=$expectedInsightfaceHome"
    }

    $credentials = Get-DotEnvValue -Path $aiEnv -Name 'GOOGLE_APPLICATION_CREDENTIALS'
    if (-not [string]::IsNullOrWhiteSpace($credentials)) {
        $credentialPath = $credentials
        if (-not [System.IO.Path]::IsPathRooted($credentialPath)) {
            $credentialPath = Join-Path $aiRoot $credentialPath
        }
        if (-not (Test-Path -LiteralPath $credentialPath -PathType Leaf)) {
            throw "Google Cloud credential file not found: $credentialPath"
        }
    }
}

function Assert-Toolchain {
    $docker = Get-RequiredCommand @('docker.exe', 'docker') 'Install and start Docker Desktop.'
    $java = Get-RequiredCommand @('java.exe', 'java') 'Install JDK 21 and add it to PATH.'
    $node = Get-RequiredCommand @('node.exe', 'node') 'Install Node.js 22 LTS.'
    $npm = Get-RequiredCommand @('npm.cmd') 'Install Node.js with npm.'
    $python = Get-RequiredCommand @('python.exe', 'python') 'Install Python 3.14 and add it to PATH.'

    # `java -version` writes to stderr; with `$ErrorActionPreference = Stop`
    # that stream can become a terminating NativeCommandError in PowerShell.
    # `--version` emits the same information on stdout and is safe to capture.
    $javaVersion = (& $java --version 2>$null | Out-String)
    if ($LASTEXITCODE -ne 0 -or $javaVersion -notmatch '(?m)^java\s+21(?:\.|\s)') {
        throw "JDK 21 is required. Detected: $($javaVersion.Trim())"
    }
    $nodeVersion = (& $node --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(\d+)\.' -or [int]$matches[1] -lt 18) {
        throw "Node.js 18 or newer is required. Detected: $nodeVersion"
    }
    & $python -c 'import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 14) else 1)'
    if ($LASTEXITCODE -ne 0) {
        throw "Python 3.14 is required. Detected: $((& $python --version 2>&1 | Out-String).Trim())"
    }
    # Docker Desktop may print harmless config warnings to stderr. Temporarily
    # lower PowerShell's native-command error preference while checking the
    # exit codes so those warnings do not abort the diagnostic prematurely.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $docker compose version *> $null
        $composeExitCode = $LASTEXITCODE
        & $docker info *> $null
        $dockerExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($composeExitCode -ne 0) { throw 'Docker Compose v2 is required.' }
    if ($dockerExitCode -ne 0) { throw 'Docker Desktop engine is not running. Start Docker Desktop and try again.' }

    return @{ Docker = $docker; Npm = $npm; Python = $python; NodeVersion = $nodeVersion }
}

function Assert-InstalledDependencies {
    $missing = [System.Collections.Generic.List[string]]::new()
    if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot 'node_modules') -PathType Container)) { $missing.Add('frontend\node_modules') }
    if (-not (Test-Path -LiteralPath (Join-Path $aiRoot '.venv\Scripts\python.exe') -PathType Leaf)) { $missing.Add('ai-service\.venv') }
    if ($missing.Count -gt 0) { throw "Dependencies are not installed: $($missing -join ', '). Run 'make setup' first." }
}

function Start-Infrastructure {
    param([string] $Docker = 'docker')
    Write-Step 'Starting Docker Compose dependencies'
    Invoke-ProjectCommand $projectRoot $Docker @('compose', 'up', '-d') 'docker compose up -d'
}

function Wait-ForPostgres {
    param([string] $Docker = 'docker')
    if ($DryRun) {
        Write-Host '[DRY-RUN] wait for godotlaunch-postgres to become healthy'
        return
    }

    Write-Step 'Waiting for PostgreSQL health check'
    for ($attempt = 1; $attempt -le 45; $attempt++) {
        $status = (& $Docker inspect --format '{{.State.Health.Status}}' godotlaunch-postgres 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -eq 0 -and $status -eq 'healthy') {
            Write-Host '[OK] PostgreSQL is healthy.' -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }
    throw 'PostgreSQL did not become healthy within 90 seconds. Run docker compose logs postgres.'
}

function Invoke-Doctor {
    Write-Step 'Checking environment files and machine-specific paths'
    Assert-EnvironmentFiles
    Write-Host '[OK] All three .env files are ready.' -ForegroundColor Green
    Write-Step 'Checking local toolchain'
    $tools = Assert-Toolchain
    Write-Host "[OK] Docker Desktop, JDK 21, $($tools.NodeVersion), npm, and Python 3.14 are ready." -ForegroundColor Green
    if (Get-Command 'make.exe', 'make' -ErrorAction SilentlyContinue | Select-Object -First 1) {
        Write-Host '[OK] GNU Make is available.' -ForegroundColor Green
    } else {
        Write-Host '[NOTE] GNU Make is optional; use scripts\project.ps1 directly.' -ForegroundColor Yellow
    }
    if ((Test-Path (Join-Path $frontendRoot 'node_modules')) -and (Test-Path (Join-Path $aiRoot '.venv\Scripts\python.exe'))) {
        Write-Host '[OK] Frontend and AI dependencies are installed.' -ForegroundColor Green
    } else {
        Write-Host '[NOTE] Dependencies are not fully installed; run make setup.' -ForegroundColor Yellow
    }
}

function Invoke-Setup {
    $tools = if ($DryRun) { @{ Docker = 'docker'; Npm = 'npm.cmd'; Python = 'python' } } else { Assert-EnvironmentFiles; Assert-Toolchain }
    Start-Infrastructure $tools.Docker
    Wait-ForPostgres $tools.Docker

    Write-Step 'Installing locked frontend dependencies'
    Invoke-ProjectCommand $frontendRoot $tools.Npm @('ci') 'npm.cmd ci'
    Write-Step 'Downloading backend Maven dependencies'
    Invoke-ProjectCommand $backendRoot (Join-Path $backendRoot 'mvnw.cmd') @('dependency:go-offline', '-DskipTests') '.\mvnw.cmd dependency:go-offline -DskipTests'

    Write-Step 'Creating the AI virtual environment'
    $venvPython = Join-Path $aiRoot '.venv\Scripts\python.exe'
    if ($DryRun -or -not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
        Invoke-ProjectCommand $aiRoot $tools.Python @('-m', 'venv', '.venv') 'python -m venv .venv'
    } else {
        Write-Host '[OK] ai-service\.venv already exists.' -ForegroundColor Green
    }

    Write-Step 'Installing AI dependencies (CPU build)'
    Invoke-ProjectCommand $aiRoot $venvPython @('-m', 'pip', 'install', '--upgrade', 'pip') '.venv\Scripts\python.exe -m pip install --upgrade pip'
    Invoke-ProjectCommand $aiRoot $venvPython @('-m', 'pip', 'install', 'torch', '--index-url', 'https://download.pytorch.org/whl/cpu') '.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu'
    Invoke-ProjectCommand $aiRoot $venvPython @('-m', 'pip', 'install', '-r', 'requirements.txt') '.venv\Scripts\python.exe -m pip install -r requirements.txt'
    Write-Step 'Downloading and validating the ArcFace model'
    Invoke-ProjectCommand $aiRoot $venvPython @('-c', 'from face_service import preload_models; preload_models()') ".venv\Scripts\python.exe -c 'from face_service import preload_models; preload_models()'"
    Write-Host "`n[OK] Setup completed. Run 'make run' to start the project." -ForegroundColor Green
}

function Start-LocalService {
    param([Parameter(Mandatory)][ValidateSet('backend', 'frontend', 'ai-service')][string] $Service)
    if ($DryRun) {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $serviceLauncher $Service -DryRun
        if ($LASTEXITCODE -ne 0) { throw "Unable to plan service: $Service" }
        return
    }
    $arguments = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$serviceLauncher`" $Service"
    Start-Process powershell.exe -ArgumentList $arguments -WorkingDirectory $projectRoot | Out-Null
}

function Invoke-Run {
    if ($DryRun) { $docker = 'docker' } else {
        Assert-EnvironmentFiles
        $tools = Assert-Toolchain
        Assert-InstalledDependencies
        $docker = $tools.Docker
    }
    Start-Infrastructure $docker
    Wait-ForPostgres $docker
    Write-Step 'Starting local application services in separate windows'
    Start-LocalService 'backend'
    Start-LocalService 'ai-service'
    Start-LocalService 'frontend'
    Write-Host @'

[OK] GodotLaunch is starting:
  Frontend:   http://localhost:3000
  Backend:    http://localhost:8080
  AI Swagger: http://localhost:8001/docs

Keep the three service windows open. Close them to stop local services.
'@ -ForegroundColor Green
}

function Wait-ForBackendHealth {
    if ($DryRun) {
        Write-Step 'Waiting for backend health (Flyway migrations)'
        Write-Host '[DRY-RUN] GET http://localhost:8080/actuator/health until HTTP 200'
        return
    }

    Write-Step 'Waiting for backend health (Flyway migrations)'
    $deadline = (Get-Date).AddSeconds(180)
    do {
        try {
            $response = Invoke-WebRequest -Uri 'http://localhost:8080/actuator/health' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host '[OK] Backend is healthy and database migrations are complete.' -ForegroundColor Green
                return
            }
        }
        catch {
            # The backend needs time to download dependencies and run Flyway.
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)

    throw 'Backend did not become healthy within 180 seconds. Check the backend PowerShell window and backend logs.'
}

function Invoke-InitialData {
    $seedScript = Join-Path $backendRoot 'seed\run_all_seeds.ps1'
    $bannerScript = Join-Path $projectRoot 'upload_banner_images.ps1'
    $gameScript = Join-Path $projectRoot 'upload_game_images.ps1'
    foreach ($script in @($seedScript, $bannerScript, $gameScript)) {
        if (-not (Test-Path -LiteralPath $script -PathType Leaf)) {
            throw "Initial data script not found: $script"
        }
    }

    Write-Step 'Loading development seed data and sample images'
    Invoke-ProjectCommand $projectRoot 'powershell.exe' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $seedScript, '-Force') 'powershell -File backend\seed\run_all_seeds.ps1 -Force'
    Invoke-ProjectCommand $projectRoot 'powershell.exe' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $bannerScript) 'powershell -File upload_banner_images.ps1'
    Invoke-ProjectCommand $projectRoot 'powershell.exe' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $gameScript) 'powershell -File upload_game_images.ps1'
    Write-Host '[OK] Development seed data and sample images loaded.' -ForegroundColor Green
}

function Invoke-InfrastructureDown {
    $docker = if ($DryRun) { 'docker' } else { Get-RequiredCommand @('docker.exe', 'docker') 'Install Docker Desktop.' }
    Write-Step 'Stopping Docker Compose dependencies (data volumes are preserved)'
    Invoke-ProjectCommand $projectRoot $docker @('compose', 'down') 'docker compose down'
}

try {
    switch ($Action) {
        'help' { Show-Help }
        'doctor' { Invoke-Doctor }
        'setup' { Invoke-Setup }
        'run' { Invoke-Run }
        'first-run' {
            Invoke-Setup
            Invoke-Run
            Wait-ForBackendHealth
            Invoke-InitialData
        }
        'infra-up' {
            $docker = if ($DryRun) { 'docker' } else { Get-RequiredCommand @('docker.exe', 'docker') 'Install Docker Desktop.' }
            Start-Infrastructure $docker
            Wait-ForPostgres $docker
        }
        'infra-down' { Invoke-InfrastructureDown }
    }
}
catch {
    Write-Host "`n[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
