param(
  [string]$ProjectRoot = (Split-Path $PSScriptRoot -Parent),
  [int]$KeepDays = 30,
  [int]$OneDriveKeepDays = 90
)

$ErrorActionPreference = 'Stop'
$BackupRoot = Join-Path $ProjectRoot 'backups'
$LogFile = Join-Path $BackupRoot 'backup.log'
$OneDriveBase = Join-Path $env:USERPROFILE 'OneDrive'
$OneDriveRoot = Join-Path $OneDriveBase 'LifeNumBackups'

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-Output $line
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

try {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $target = Join-Path $BackupRoot $stamp
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Write-Log "Backup started -> $target"

  $npx = (Get-Command npx.cmd -ErrorAction Stop).Source
  $dump = Join-Path $target 'd1-lifenum.sql'
  Push-Location $ProjectRoot
  try {
    & $npx wrangler d1 export lifenum --remote --output $dump -y 2>&1 | ForEach-Object { Write-Log "wrangler: $_" }
  } finally {
    Pop-Location
  }
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dump)) {
    throw "D1 export failed (exit $LASTEXITCODE)"
  }
  Write-Log ("D1 export OK ({0:N1} KB)" -f ((Get-Item $dump).Length / 1KB))

  $tar = 'C:\Windows\System32\tar.exe'
  $sourceArchive = Join-Path $target 'source.tar.gz'
  if (Test-Path $tar) {
    & $tar -czf $sourceArchive `
      --exclude=node_modules `
      --exclude=dist `
      --exclude=.wrangler `
      --exclude=backups `
      --exclude=.git `
      --exclude=.keys `
      --exclude=.dev.vars `
      --exclude=android/.gradle `
      --exclude=android/app/build `
      --exclude=android/local.properties `
      --exclude=android/keystore.properties `
      --exclude=ios/App/App/public `
      -C $ProjectRoot .
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $sourceArchive)) {
      throw "Source archive failed (exit $LASTEXITCODE)"
    }
    Write-Log ("Source archive OK ({0:N1} MB)" -f ((Get-Item $sourceArchive).Length / 1MB))
  } else {
    Write-Log 'tar.exe not found; skipping source archive'
  }

  $secretDir = Join-Path $target 'secrets'
  New-Item -ItemType Directory -Force -Path $secretDir | Out-Null
  $secretFiles = @(
    (Join-Path $ProjectRoot '.keys\lifenum-upload.jks'),
    (Join-Path $ProjectRoot '.keys\revenuecat-webhook-token.txt'),
    (Join-Path $ProjectRoot 'android\keystore.properties'),
    (Join-Path $ProjectRoot '.dev.vars'),
    (Join-Path $ProjectRoot 'config.txt')
  )
  foreach ($file in $secretFiles) {
    if (Test-Path $file) {
      Copy-Item $file -Destination $secretDir -Force
    }
  }
  & icacls.exe $secretDir /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)F" | Out-Null
  Write-Log "Secrets copied (keystore / webhook token / local vars)"

  if (Test-Path $OneDriveBase) {
    New-Item -ItemType Directory -Force -Path $OneDriveRoot | Out-Null
    $cloudDir = Join-Path $OneDriveRoot $stamp
    New-Item -ItemType Directory -Force -Path $cloudDir | Out-Null
    Copy-Item $dump -Destination $cloudDir -Force
    if (Test-Path $sourceArchive) {
      Copy-Item $sourceArchive -Destination $cloudDir -Force
    }
    Write-Log "OneDrive copy OK -> $cloudDir (no secrets)"
  } else {
    Write-Log 'OneDrive folder not found; skipped off-site copy'
  }

  Get-ChildItem $BackupRoot -Directory |
    Where-Object { $_.Name -match '^\d{8}-\d{6}$' -and $_.CreationTime -lt (Get-Date).AddDays(-$KeepDays) } |
    ForEach-Object {
      Remove-Item $_.FullName -Recurse -Force
      Write-Log "Rotated local backup $($_.Name)"
    }

  if (Test-Path $OneDriveBase) {
    Get-ChildItem $OneDriveRoot -Directory |
      Where-Object { $_.Name -match '^\d{8}-\d{6}$' -and $_.CreationTime -lt (Get-Date).AddDays(-$OneDriveKeepDays) } |
      ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force
        Write-Log "Rotated OneDrive backup $($_.Name)"
      }
  }

  Write-Log "Backup finished OK"
  exit 0
} catch {
  Write-Log "Backup FAILED: $($_.Exception.Message)"
  exit 1
}
