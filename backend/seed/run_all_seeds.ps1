param(
    [string]$ContainerName = "godotlaunch-postgres",
    [string]$Database = "godot_launch",
    [string]$DatabaseUser = "user_godot_launch",
    [string]$RedisContainerName = "godotlaunch-redis",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$seedFiles = @(
    "seed_users.sql",
    "seed_games_assets.sql",
    "seed_games.sql",
    "reseed_tags_relations.sql",
    "seed_content_collections.sql"
)

Write-Host "GodotLaunch database seed runner" -ForegroundColor Cyan
Write-Host "Container: $ContainerName | Database: $Database | User: $DatabaseUser"
Write-Warning "The game/asset seed files delete and recreate development data. Do not run this against production."

if (-not $Force) {
    $confirmation = Read-Host "Type SEED to continue"
    if ($confirmation -cne "SEED") {
        Write-Host "Seed cancelled."
        exit 0
    }
}

docker inspect $ContainerName *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker container '$ContainerName' does not exist. Start PostgreSQL first."
}

$running = docker inspect --format "{{.State.Running}}" $ContainerName
if ($LASTEXITCODE -ne 0 -or $running.Trim() -ne "true") {
    throw "Docker container '$ContainerName' is not running."
}

$containerSeedPath = "/tmp/godotlaunch-current-seed.sql"

foreach ($seedFileName in $seedFiles) {
    $localSeedPath = Join-Path $PSScriptRoot $seedFileName
    if (-not (Test-Path -LiteralPath $localSeedPath -PathType Leaf)) {
        throw "Required seed file not found: $localSeedPath"
    }

    Write-Host "`nRunning $seedFileName..." -ForegroundColor Yellow

    docker cp $localSeedPath "${ContainerName}:$containerSeedPath"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not copy $seedFileName into container '$ContainerName'."
    }

    docker exec $ContainerName psql `
        -U $DatabaseUser `
        -d $Database `
        -v ON_ERROR_STOP=1 `
        --single-transaction `
        -f $containerSeedPath

    if ($LASTEXITCODE -ne 0) {
        throw "Seed failed at $seedFileName. Later seed files were not executed."
    }

    Write-Host "Completed $seedFileName" -ForegroundColor Green
}

Write-Host "`nAll seed files completed successfully." -ForegroundColor Green

[string]$runningRedisContainer = docker ps `
    --filter "name=^/${RedisContainerName}$" `
    --filter "status=running" `
    --format "{{.Names}}"

if ($LASTEXITCODE -eq 0 -and $runningRedisContainer.Trim() -eq $RedisContainerName) {
    docker exec $RedisContainerName redis-cli DEL homepage:v2 *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Invalidated Redis key homepage:v2." -ForegroundColor Green
    } else {
        Write-Warning "Seeds succeeded, but homepage:v2 could not be invalidated. It will expire through its TTL."
    }
} else {
    Write-Host "Redis container is not running; homepage cache invalidation was skipped." -ForegroundColor DarkGray
}

Write-Host "Local images are not uploaded by this runner. Run .\upload_game_images.ps1 and .\upload_banner_images.ps1 separately from the repository root if needed." -ForegroundColor DarkGray
