# PowerShell Script to upload local game/asset images to SeaweedFS and link them to the Database
# Run this script from PowerShell: .\upload_game_images.ps1

Param(
    [string]$SourceFolder = "$PSScriptRoot\resource\media",
    [string]$FilerUrl = "http://localhost:8888",
    [string]$DbUser = "user_godot_launch",
    [string]$DbName = "godot_launch"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " GodotLaunch Image Auto-Uploader & DB Linker" -ForegroundColor Cyan
Write-Host " (Mode: First image is Thumbnail, next 5 are Screenshots)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check if SeaweedFS Filer is running
try {
    $filerCheck = Invoke-RestMethod -Uri "$FilerUrl/" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[OK] Connected to SeaweedFS Filer at $FilerUrl" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Cannot connect to SeaweedFS Filer at $FilerUrl. Make sure docker-compose is running!" -ForegroundColor Red
    Exit
}

# 2. Check if source folder exists
if (-not (Test-Path $SourceFolder)) {
    Write-Host "[ERROR] Source folder '$SourceFolder' not found." -ForegroundColor Red
    Write-Host "Please check the path and make sure it exists." -ForegroundColor Yellow
    Exit
}

# 3. Retrieve all Assets and Games from the Database
Write-Host "Retrieving assets and games list from database..." -ForegroundColor Yellow

$queryCmdAssets = "docker exec -i godotlaunch-postgres psql -U $DbUser -d $DbName -t -A -c `"SELECT id, title, 'asset' AS item_type FROM assets;`""
$dbOutputAssets = Invoke-Expression $queryCmdAssets

$queryCmdGames = "docker exec -i godotlaunch-postgres psql -U $DbUser -d $DbName -t -A -c `"SELECT id, title, 'game' AS item_type FROM games;`""
$dbOutputGames = Invoke-Expression $queryCmdGames

$items = @()

# Parse Assets
if ($dbOutputAssets) {
    foreach ($line in $dbOutputAssets) {
        if ($line.Contains("|")) {
            $parts = $line.Split("|")
            $items += [PSCustomObject]@{
                Id    = $parts[0].Trim()
                Title = $parts[1].Trim()
                Type  = $parts[2].Trim()
            }
        }
    }
}

# Parse Games
if ($dbOutputGames) {
    foreach ($line in $dbOutputGames) {
        if ($line.Contains("|")) {
            $parts = $line.Split("|")
            $items += [PSCustomObject]@{
                Id    = $parts[0].Trim()
                Title = $parts[1].Trim()
                Type  = $parts[2].Trim()
            }
        }
    }
}

Write-Host "Found $($items.Count) items in database (Assets & Games)." -ForegroundColor Green

# Helper function to sanitize names for folder matching
function Get-FolderFriendlyName($name) {
    # Remove special characters, spaces, and make lowercase to maximize matching probability
    $sanitized = ($name -replace '[^a-zA-Z0-9\s-]', '').Trim().ToLower()
    # Normalize multiple spaces/dashes to single dash for folder matching
    $sanitized = $sanitized -replace '\s+', '-'
    $sanitized = $sanitized -replace '-+', '-'
    return $sanitized
}

# 4. Scan and Upload images
foreach ($item in $items) {
    Write-Host "`n----------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Processing $($item.Type.ToUpper()): '$($item.Title)'" -ForegroundColor White
    Write-Host "ID: $($item.Id)" -ForegroundColor DarkGray
    
    # Match folder name
    $targetFolder = $null
    $friendlyItemTitle = Get-FolderFriendlyName $item.Title
    
    $subfolders = Get-ChildItem -Path $SourceFolder -Directory -Recurse
    foreach ($folder in $subfolders) {
        $friendlyFolderName = Get-FolderFriendlyName $folder.Name
        
        # Match if folder name is similar or substring of the item title
        if ($friendlyFolderName -eq $friendlyItemTitle -or 
            $friendlyItemTitle.Contains($friendlyFolderName) -or 
            $friendlyFolderName.Contains($friendlyItemTitle)) {
            $targetFolder = $folder
            break
        }
    }
    
    if (-not $targetFolder) {
        Write-Host "[Skip] No matching folder found for '$($item.Title)'" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "[Found] Matching folder: '$($targetFolder.FullName)'" -ForegroundColor Green
    
    # Get all valid image files in alphabetical order
    $imageFiles = Get-ChildItem -Path $targetFolder.FullName -File | Where-Object { 
        $_.Extension -match "\.(jpg|jpeg|png|webp|gif)" 
    } | Sort-Object Name
    
    if ($imageFiles.Count -eq 0) {
        Write-Host "[Skip] Folder is empty or contains no images (.jpg, .png, .webp)" -ForegroundColor Yellow
        continue
    }
    
    # First image is Thumbnail
    $thumbFile = $imageFiles[0]
    
    # Next up to 5 images are Screenshots
    $screenshots = $imageFiles | Select-Object -Skip 1 -First 5
    
    # Configure path and columns based on item type
    $objectPathPrefix = ""
    $tableName = ""
    $fkColumn = ""
    
    if ($item.Type -eq "asset") {
        $objectPathPrefix = "marketplace/items/$($item.Id)"
        $tableName = "assets"
        $fkColumn = "asset_id"
    } else {
        $objectPathPrefix = "games/$($item.Id)"
        $tableName = "games"
        $fkColumn = "game_id"
    }
    
    # Upload Thumbnail
    $uploadedThumbUrl = $null
    Write-Host "Uploading thumbnail (First file): $($thumbFile.Name)..." -ForegroundColor Yellow
    $objectKey = "$objectPathPrefix/media/thumbnail$($thumbFile.Extension)"
    $uploadUrl = "$FilerUrl/godotlaunch/$objectKey"
    
    try {
        # PUT request with raw binary content
        $response = Invoke-RestMethod -Uri $uploadUrl -Method Put -InFile $thumbFile.FullName -ContentType "image/jpeg"
        $uploadedThumbUrl = "http://localhost:8888/godotlaunch/$objectKey"
        Write-Host "   Uploaded to SeaweedFS successfully." -ForegroundColor Green
        
        # Update asset/game thumbnail in database
        $sql = "UPDATE $tableName SET thumbnail_url = '$uploadedThumbUrl' WHERE id = '$($item.Id)';"
        $execCmd = "docker exec -i godotlaunch-postgres psql -U $DbUser -d $DbName -c `"$sql`""
        Invoke-Expression $execCmd | Out-Null
        
        # Delete old thumbnail record in media
        $delSql = "DELETE FROM media WHERE $fkColumn = '$($item.Id)' AND media_type = 'thumbnail';"
        $execCmd = "docker exec -i godotlaunch-postgres psql -U $DbUser -d $DbName -c `"$delSql`""
        Invoke-Expression $execCmd | Out-Null
        
        # Insert new thumbnail record in media
        $insSql = "INSERT INTO media ($fkColumn, media_type, media_url) VALUES ('$($item.Id)', 'thumbnail', '$uploadedThumbUrl');"
        $execCmd = "docker exec -i godotlaunch-postgres psql -U $DbUser -d $DbName -c `"$insSql`""
        Invoke-Expression $execCmd | Out-Null
        
        Write-Host "   Thumbnail linked in Database." -ForegroundColor Green
    } catch {
        Write-Host "   [ERROR] Failed to upload thumbnail: $_" -ForegroundColor Red
    }
    
    # Upload Screenshots
    if ($screenshots -and $screenshots.Count -gt 0) {
        Write-Host "Found $($screenshots.Count) screenshots. Clearing old ones from DB..." -ForegroundColor Yellow
        $delSql = "DELETE FROM media WHERE $fkColumn = '$($item.Id)' AND media_type = 'screenshot';"
        $execCmd = "docker exec -i godotlaunch-postgres psql -U $DbUser -d $DbName -c `"$delSql`""
        Invoke-Expression $execCmd | Out-Null
        
        $idx = 1
        foreach ($shot in $screenshots) {
            Write-Host "Uploading screenshot $($idx): $($shot.Name)..." -ForegroundColor Yellow
            $objectKey = "$objectPathPrefix/media/screenshot_$idx$($shot.Extension)"
            $uploadUrl = "$FilerUrl/godotlaunch/$objectKey"
            
            try {
                $response = Invoke-RestMethod -Uri $uploadUrl -Method Put -InFile $shot.FullName -ContentType "image/jpeg"
                $shotUrl = "http://localhost:8888/godotlaunch/$objectKey"
                
                # Insert screenshot into media table
                $insSql = "INSERT INTO media ($fkColumn, media_type, media_url) VALUES ('$($item.Id)', 'screenshot', '$shotUrl');"
                $execCmd = "docker exec -i godotlaunch-postgres psql -U $DbUser -d $DbName -c `"$insSql`""
                Invoke-Expression $execCmd | Out-Null
                
                Write-Host "   Screenshot $($idx) uploaded and linked." -ForegroundColor Green
                $idx++
            } catch {
                Write-Host "   [ERROR] Failed to upload screenshot $($idx): $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "[Info] No other images found for screenshots." -ForegroundColor Yellow
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Upload Process Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
