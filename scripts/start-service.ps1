[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateSet('backend', 'frontend', 'ai-service')]
    [string] $Service,
    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

switch ($Service) {
    'backend' {
        $workingDirectory = Join-Path $projectRoot 'backend'
        $executable = Join-Path $workingDirectory 'mvnw.cmd'
        $arguments = @('spring-boot:run')
        $display = '.\mvnw.cmd spring-boot:run -> http://localhost:8080'
    }
    'frontend' {
        $workingDirectory = Join-Path $projectRoot 'frontend'
        $executable = 'npm.cmd'
        $arguments = @('run', 'dev')
        $display = 'npm.cmd run dev -> http://localhost:3000'
    }
    'ai-service' {
        $workingDirectory = Join-Path $projectRoot 'ai-service'
        $executable = Join-Path $workingDirectory '.venv\Scripts\python.exe'
        $arguments = @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8001', '--reload')
        $display = '.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload -> http://localhost:8001'
    }
}

if ($DryRun) {
    Write-Host "[DRY-RUN] ${Service}: $display"
    exit 0
}

Set-Location $workingDirectory
Write-Host "Starting ${Service}: $display" -ForegroundColor Cyan
& $executable @arguments
exit $LASTEXITCODE
