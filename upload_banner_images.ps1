# PowerShell Script to upload local banner images to SeaweedFS and link them
# to the `banners` table created by the V3__banners.sql migration.
#
# Matches files to banners by display_order: the images are sorted
# alphabetically by filename and assigned to display_order = 1, 2, 3, ...
# in that order. Run this AFTER the app has started at least once (so the
# V3 migration has created the default banner rows) and AFTER SeaweedFS is
# running.
#
# Run this script from PowerShell: .\upload_banner_images.ps1

Param(
    [string]$SourceFolder = "$PSScriptRoot\resource\media\banner",
    [string]$FilerUrl = "http://localhost:8888",
    [string]$DbUser = "user_godot_launch",
    [string]$DbName = "godot_launch",
    [string]$ContainerName = "godotlaunch-postgres",
    [string]$BasePath = "godotlaunch"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " GodotLaunch Banner Image Auto-Uploader & DB Linker" -ForegroundColor Cyan
Write-Host " (Images are matched to banners by display_order, in" -ForegroundColor Cyan
Write-Host "  alphabetical filename order)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check if SeaweedFS Filer is running
try {
    Invoke-RestMethod -Uri "$FilerUrl/" -Method Get -TimeoutSec 3 -ErrorAction Stop | Out-Null
    Write-Host "[OK] Connected to SeaweedFS Filer at $FilerUrl" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Cannot connect to SeaweedFS Filer at $FilerUrl. Make sure docker-compose is running!" -ForegroundColor Red
    Exit 1
}

# 2. Check if source folder exists
if (-not (Test-Path $SourceFolder)) {
    Write-Host "[ERROR] Source folder '$SourceFolder' not found." -ForegroundColor Red
    Exit 1
}

# 3. Retrieve existing banners ordered by display_order (rows come from V3__banners.sql)
Write-Host "Retrieving banners list from database..." -ForegroundColor Yellow

$queryCmd = "docker exec -i $ContainerName psql -U $DbUser -d $DbName -t -A -c `"SELECT id, display_order, title FROM banners ORDER BY display_order ASC, created_at ASC;`""
$dbOutput = Invoke-Expression $queryCmd

$banners = @()
if ($dbOutput) {
    foreach ($line in $dbOutput) {
        if ($line.Contains("|")) {
            $parts = $line.Split("|")
            $banners += [PSCustomObject]@{
                Id           = $parts[0].Trim()
                DisplayOrder = $parts[1].Trim()
                Title        = $parts[2].Trim()
            }
        }
    }
}

if ($banners.Count -eq 0) {
    Write-Host "[ERROR] No rows found in the 'banners' table. Has the app run the V3 migration yet?" -ForegroundColor Red
    Exit 1
}

Write-Host "Found $($banners.Count) banner row(s) in database." -ForegroundColor Green

# 4. Get all valid image files, sorted alphabetically by filename
$imageFiles = Get-ChildItem -Path $SourceFolder -File | Where-Object {
    $_.Extension -match "\.(jpg|jpeg|png|webp|gif)"
} | Sort-Object Name

if ($imageFiles.Count -eq 0) {
    Write-Host "[ERROR] No image files (.jpg, .jpeg, .png, .webp, .gif) found in '$SourceFolder'." -ForegroundColor Red
    Exit 1
}

Write-Host "Found $($imageFiles.Count) image file(s) in '$SourceFolder':" -ForegroundColor Green
foreach ($f in $imageFiles) { Write-Host "  - $($f.Name)" -ForegroundColor DarkGray }

if ($imageFiles.Count -ne $banners.Count) {
    Write-Host "[WARN] Image count ($($imageFiles.Count)) does not match banner row count ($($banners.Count))." -ForegroundColor Yellow
    Write-Host "        Extra banners will be left untouched; extra images will be skipped." -ForegroundColor Yellow
}

# 5. Upload each image and link it to the banner at the matching position
$pairCount = [Math]::Min($imageFiles.Count, $banners.Count)

for ($i = 0; $i -lt $pairCount; $i++) {
    $image = $imageFiles[$i]
    $banner = $banners[$i]

    Write-Host "`n----------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Banner display_order=$($banner.DisplayOrder) '$($banner.Title)' <- $($image.Name)" -ForegroundColor White
    Write-Host "Banner ID: $($banner.Id)" -ForegroundColor DarkGray

    $objectKey = "banners/$($banner.Id)$($image.Extension)"
    $uploadUrl = "$FilerUrl/$BasePath/$objectKey"

    try {
        Invoke-RestMethod -Uri $uploadUrl -Method Put -InFile $image.FullName -ContentType "image/jpeg" | Out-Null
        $publicUrl = "$FilerUrl/$BasePath/$objectKey"
        Write-Host "   Uploaded to SeaweedFS: $publicUrl" -ForegroundColor Green

        $escapedUrl = $publicUrl.Replace("'", "''")
        $sql = "UPDATE banners SET image_url = '$escapedUrl', updated_at = now() WHERE id = '$($banner.Id)';"
        $execCmd = "docker exec -i $ContainerName psql -U $DbUser -d $DbName -c `"$sql`""
        Invoke-Expression $execCmd | Out-Null

        Write-Host "   Banner row updated in database." -ForegroundColor Green
    } catch {
        Write-Host "   [ERROR] Failed to upload/link '$($image.Name)': $_" -ForegroundColor Red
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Banner Upload Process Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
