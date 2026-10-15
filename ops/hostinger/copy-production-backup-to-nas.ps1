param(
    [Parameter(Mandatory)][ValidatePattern('^/home/kws-admin/\.kws-production-backup-export/\d{8}T\d{6}Z$')][string]$RemoteDirectory,
    [string]$Destination = 'M:\Customer\Boulder und Kletterwelt GmbH\KWS BETA APP\Backups\Production'
)
$ErrorActionPreference = 'Stop'
$taskNasRoot = 'M:\Customer\Boulder und Kletterwelt GmbH'
$taskTarget = [IO.Path]::GetFullPath($Destination)
if (-not $taskTarget.StartsWith($taskNasRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Backup destination outside KWS NAS directory' }
if (-not (Test-Path -LiteralPath $taskNasRoot)) { throw 'NAS unavailable; source archive retained' }
$taskSshOptions = @('-i', "$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop", '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', "UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts_kws", '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'KexAlgorithms=curve25519-sha256', '-o', 'ConnectTimeout=10')
$taskRaw = & ssh.exe -T @taskSshOptions 'kws-admin@187.7.70.230' "cat '$RemoteDirectory/manifest.json'"
if ($LASTEXITCODE -ne 0) { throw 'Encrypted backup manifest unavailable' }
$taskManifest = $taskRaw | ConvertFrom-Json
if (-not $taskManifest.encrypted_only -or -not $taskManifest.database_restore_tested -or $taskManifest.files.Count -ne 4) { throw 'Unverified production archive' }
$taskStamp = Split-Path -Leaf $RemoteDirectory
$taskSet = Join-Path $taskTarget $taskStamp
New-Item -ItemType Directory -Path $taskSet -Force | Out-Null
$taskExpected = @("$taskStamp.tar.age", "$taskStamp.tar.age.sha256", "$taskStamp.tar.age.verified.json", "$taskStamp.tar.age.restore-verified.json")
foreach ($taskFile in $taskManifest.files) {
    if ($taskFile.name -notin $taskExpected -or $taskFile.sha256 -notmatch '^[a-f0-9]{64}$' -or $taskFile.bytes -le 0) { throw 'Invalid backup file identity' }
    $taskPath = Join-Path $taskSet $taskFile.name
    if (-not (Test-Path -LiteralPath $taskPath)) {
        $taskPartial = $taskPath + '.partial'
        & scp.exe @taskSshOptions "kws-admin@187.7.70.230:$RemoteDirectory/$($taskFile.name)" $taskPartial
        if ($LASTEXITCODE -ne 0) { throw 'Transfer interrupted; server archive retained' }
        if ((Get-Item -LiteralPath $taskPartial).Length -ne $taskFile.bytes -or (Get-FileHash -LiteralPath $taskPartial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskFile.sha256) { throw 'Partial NAS file checksum mismatch' }
        Move-Item -LiteralPath $taskPartial -Destination $taskPath
    }
    if ((Get-Item -LiteralPath $taskPath).Length -ne $taskFile.bytes -or (Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskFile.sha256) { throw 'NAS archive checksum mismatch' }
}
$taskManifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskSet 'manifest.json') -Encoding utf8
$taskReport = [pscustomobject]@{ independent_nas_copy_verified=$true; encrypted_archive="$taskStamp.tar.age"; checksum_verified=$true; restore_proof_copied=$true; verified_at=(Get-Date).ToUniversalTime().ToString('o'); destination=$taskSet }
$taskReport | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskSet 'nas-verified.json') -Encoding utf8
$taskReport | ConvertTo-Json -Compress
