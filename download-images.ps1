# download-images.ps1
# ASCII-only script to download artist images and write artists.local.json
# Place this file in project root (next to assets folder). Save as UTF-8.

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$artistsFile = Join-Path $root "assets\artists.json"
$outImagesDir = Join-Path $root "assets\images"
$outJson = Join-Path $root "assets\artists.local.json"

if (-not (Test-Path $artistsFile)) {
    Write-Host "ERROR: artists.json not found at $artistsFile"
    exit 1
}

if (-not (Test-Path $outImagesDir)) {
    New-Item -ItemType Directory -Path $outImagesDir | Out-Null
    Write-Host "Created images directory: $outImagesDir"
}

# read JSON
$jsonRaw = Get-Content -Raw -Path $artistsFile
try {
    $artists = $jsonRaw | ConvertFrom-Json
} catch {
    Write-Host "ERROR: failed to parse JSON: $($_.Exception.Message)"
    exit 1
}

function SafeFileName([string]$s) {
    if (-not $s) { return "" }
    # replace < and > explicitly to avoid issues
    $safe = $s.Replace('<','_').Replace('>','_')
    # replace other forbidden chars \ / : * ? " |
    $safe = $safe -replace '[\\/:*?"|]', '_'
    return $safe
}

function Resolve-ImageUrl([string]$val) {
    if (-not $val) { return $null }
    $v = $val.Trim()
    if ($v -match '^data:') { return $v }
    if ($v -match '^https?://') { return $v }
    if ($v -match '^//') { return "https:$v" }
    if ($v -match '^i\.scdn\.co/') { return "https://$v" }
    if ($v -match '^ab676') { return "https://i.scdn.co/image/$v" }
    if ($v -match '\.(jpg|jpeg|png|webp|gif)$') {
        if ($v -match '^(assets/|assets\\|images/|assets/images/)') {
            $full = Join-Path $root $v
            if (Test-Path $full) { return (Convert-Path $full) }
        }
        return ("https://$v" -replace '^https://https://', 'https://')
    }
    if ($v -match '\.') { return ("https://" + $v) }
    return "https://i.scdn.co/image/$v"
}

function Get-ExtFromUrlOrHead($url) {
    try {
        if (-not $url) { return ".jpg" }
        if ($url -match '^data:image\/svg') { return ".svg" }
        if ($url -match '^data:image\/png') { return ".png" }
        $u = [Uri] $url
        $ext = [System.IO.Path]::GetExtension($u.AbsolutePath)
        if ($ext -and $ext -ne '') { return $ext }
        # try HEAD
        try {
            $req = [System.Net.WebRequest]::Create($url)
            $req.Method = "HEAD"
            $resp = $req.GetResponse()
            $ct = $resp.Headers["Content-Type"]
            $resp.Close()
            if ($ct) {
                if ($ct -match 'image\/png') { return ".png" }
                if ($ct -match 'image\/jpeg') { return ".jpg" }
                if ($ct -match 'image\/webp') { return ".webp" }
                if ($ct -match 'image\/svg') { return ".svg" }
                if ($ct -match 'image\/gif') { return ".gif" }
            }
        } catch {
            # ignore head error
        }
        return ".jpg"
    } catch {
        return ".jpg"
    }
}

# simple placeholders (ascii-only strings)
$personSvg = @'
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="100%" height="100%" fill="#e6e6e6"/>
  <g fill="#999">
    <circle cx="300" cy="200" r="110"/>
    <path d="M120 460c30-60 360-60 420 0v40H120z"/>
  </g>
</svg>
'@

$index = 0
foreach ($artist in $artists) {
    $index++
    $id = $artist.id
    if (-not $id) { $id = "artist_$index" }
    $safeId = SafeFileName $id
    $srcVal = $artist.image

    $resolved = Resolve-ImageUrl $srcVal
    $ext = Get-ExtFromUrlOrHead $resolved
    if ($ext -ieq ".jpeg") { $ext = ".jpg" }

    $localFileName = "$safeId$ext"
    $localPath = Join-Path $outImagesDir $localFileName

    Write-Host "[$index] $($artist.name) -> $localFileName (source: $resolved)"

    $downloadSucceeded = $false
    if ($null -ne $resolved) {
        try {
            Invoke-WebRequest -Uri $resolved -OutFile $localPath -ErrorAction Stop -UseBasicParsing
            $downloadSucceeded = $true
        } catch {
            try {
                $wc = New-Object System.Net.WebClient
                $wc.DownloadFile($resolved, $localPath)
                $wc.Dispose()
                $downloadSucceeded = $true
            } catch {
                $downloadSucceeded = $false
            }
        }
    }

    if (-not $downloadSucceeded) {
        $fallbackName = "$safeId.svg"
        $fallbackPath = Join-Path $outImagesDir $fallbackName
        Set-Content -Path $fallbackPath -Value $personSvg -Encoding UTF8
        Write-Host "-> placeholder created: $fallbackName"
        $artist.image = "assets/images/$fallbackName"
    } else {
        $artist.image = "assets/images/$localFileName"
    }
}

# Save result
try {
    $artists | ConvertTo-Json -Depth 10 | Set-Content -Path $outJson -Encoding UTF8
    Write-Host "DONE. Output: $outJson"
} catch {
    Write-Host "ERROR: failed to save $outJson : $($_.Exception.Message)"
}
