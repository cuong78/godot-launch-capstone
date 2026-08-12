# PowerShell Script to create and upload sample project ZIP bundles to SeaweedFS for all Assets and Games
# Run this script: .\upload_zip_bundles.ps1

Param(
    [string]$FilerUrl = "http://localhost:8888",
    [string]$DbUser = "user_godot_launch",
    [string]$DbName = "godot_launch",
    [string]$ContainerName = "godotlaunch-postgres",
    [string]$BasePath = "godotlaunch"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " GodotLaunch Sample Zip Bundles Uploader & DB Linker" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Test SeaweedFS Filer
try {
    Invoke-RestMethod -Uri "$FilerUrl/" -Method Get -TimeoutSec 3 -ErrorAction Stop | Out-Null
    Write-Host "[OK] Connected to SeaweedFS Filer at $FilerUrl" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Cannot connect to SeaweedFS Filer at $FilerUrl. Make sure docker-compose is running!" -ForegroundColor Red
    Exit 1
}

# 2. Create a temporary sample Godot project ZIP file
$tmpWorkDir = Join-Path $env:TEMP "godotlaunch_sample_bundle"
if (Test-Path $tmpWorkDir) { Remove-Item $tmpWorkDir -Recurse -Force }
New-Item $tmpWorkDir -ItemType Directory | Out-Null

# Sample project files
Set-Content -Path (Join-Path $tmpWorkDir "project.godot") -Value @'
config_version=5

[application]
config/name="Sample Godot Project"
config/features=PackedStringArray("4.2", "Forward Plus")
config/icon="res://icon.svg"
'@

Set-Content -Path (Join-Path $tmpWorkDir "main.gd") -Value @'
extends Node2D

func _ready():
    print("Welcome to GodotLaunch Sample Project!")
'@

Set-Content -Path (Join-Path $tmpWorkDir "README.md") -Value "# GodotLaunch Sample Project Bundle"

$sampleZipPath = Join-Path $env:TEMP "godotlaunch_sample_project.zip"
if (Test-Path $sampleZipPath) { Remove-Item $sampleZipPath -Force }
Compress-Archive -Path "$tmpWorkDir\*" -DestinationPath $sampleZipPath

Write-Host "[OK] Created sample Godot project ZIP at $sampleZipPath" -ForegroundColor Green

# 3. Upload ZIP for all Assets & update file_url in DB
Write-Host "`nRetrieving assets from database..." -ForegroundColor Yellow
$queryAssets = "docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c `"SELECT id, title FROM assets;`""
$assetsOutput = Invoke-Expression $queryAssets

if ($assetsOutput) {
    foreach ($line in $assetsOutput) {
        if ($line.Contains("|")) {
            $parts = $line.Split("|")
            $assetId = $parts[0].Trim()
            $assetTitle = $parts[1].Trim()

            Write-Host "Uploading ZIP for Asset: '$assetTitle' ($assetId)..." -ForegroundColor White
            $objectKey = "marketplace/items/$assetId/project.zip"
            $uploadUrl = "$FilerUrl/$BasePath/$objectKey"
            $publicUrl = "$FilerUrl/$BasePath/$objectKey"

            try {
                Invoke-RestMethod -Uri $uploadUrl -Method Put -InFile $sampleZipPath -ContentType "application/zip" | Out-Null
                
                $sql = "UPDATE assets SET file_url = '$publicUrl', updated_at = now() WHERE id = '$assetId';"
                $execCmd = "docker exec -i $ContainerName psql -U $DbUser -d $DbName -c `"$sql`""
                Invoke-Expression $execCmd | Out-Null

                Write-Host "   [OK] Uploaded to SeaweedFS & updated DB: $publicUrl" -ForegroundColor Green
            } catch {
                Write-Host "   [ERROR] Failed to upload asset ZIP: $_" -ForegroundColor Red
            }
        }
    }
}

# 4. Upload ZIP for all Games & create game_versions + source_snapshots
Write-Host "`nRetrieving games from database..." -ForegroundColor Yellow
$queryGames = "docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c `"SELECT id, title FROM games;`""
$gamesOutput = Invoke-Expression $queryGames

if ($gamesOutput) {
    foreach ($line in $gamesOutput) {
        if ($line.Contains("|")) {
            $parts = $line.Split("|")
            $gameId = $parts[0].Trim()
            $gameTitle = $parts[1].Trim()

            Write-Host "Uploading ZIP for Game: '$gameTitle' ($gameId)..." -ForegroundColor White
            $objectKey = "games/$gameId/source.zip"
            $uploadUrl = "$FilerUrl/$BasePath/$objectKey"
            $publicUrl = "$FilerUrl/$BasePath/$objectKey"

            try {
                Invoke-RestMethod -Uri $uploadUrl -Method Put -InFile $sampleZipPath -ContentType "application/zip" | Out-Null

                # Clear old game_versions & source_snapshots for this game
                $delVerSql = "DELETE FROM game_versions WHERE game_id = '$gameId';"
                Invoke-Expression "docker exec -i $ContainerName psql -U $DbUser -d $DbName -c `"$delVerSql`"" | Out-Null

                $delSnapSql = "DELETE FROM source_snapshots WHERE game_id = '$gameId';"
                Invoke-Expression "docker exec -i $ContainerName psql -U $DbUser -d $DbName -c `"$delSnapSql`"" | Out-Null

                # Insert game_version v1.0.0
                $insVerSql = "INSERT INTO game_versions (game_id, version_number, changelog, file_url, is_current) VALUES ('$gameId', '1.0.0', 'Initial release', '$publicUrl', true);"
                Invoke-Expression "docker exec -i $ContainerName psql -U $DbUser -d $DbName -c `"$insVerSql`"" | Out-Null

                # Insert source_snapshot
                $insSnapSql = "INSERT INTO source_snapshots (game_id, bundle_hash, is_godot_project, virus_clean, virus_scanned, bundle_url) VALUES ('$gameId', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', true, true, true, '$publicUrl');"
                Invoke-Expression "docker exec -i $ContainerName psql -U $DbUser -d $DbName -c `"$insSnapSql`"" | Out-Null

                Write-Host "   [OK] Uploaded to SeaweedFS & created Game Version v1.0.0 + Snapshot: $publicUrl" -ForegroundColor Green
            } catch {
                Write-Host "   [ERROR] Failed to upload game ZIP: $_" -ForegroundColor Red
            }
        }
    }
}

# Cleanup temp work dir
if (Test-Path $tmpWorkDir) { Remove-Item $tmpWorkDir -Recurse -Force }
if (Test-Path $sampleZipPath) { Remove-Item $sampleZipPath -Force }

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Sample Zip Bundles Upload Process Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
