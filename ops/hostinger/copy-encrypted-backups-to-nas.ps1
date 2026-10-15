param(
    [Parameter(Mandatory)][string]$RemoteDirectory,
    [string]$Destination = 'M:\Customer\Boulder und Kletterwelt GmbH\KWS BETA APP\Backups\Hostinger Migration\2026-10-09'
)
$ErrorActionPreference = 'Stop'
if ($RemoteDirectory -notmatch '^/home/kws-admin/\.kws-encrypted-backup-export/\d{8}T\d{6}Z$') { throw 'Unexpected encrypted export directory' }
$taskNasRoot = 'M:\Customer\Boulder und Kletterwelt GmbH'
$taskTarget = [IO.Path]::GetFullPath($Destination)
if (-not $taskTarget.StartsWith($taskNasRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Backup destination outside KWS NAS directory' }
if (-not (Test-Path -LiteralPath $taskNasRoot)) { throw 'KWS NAS unavailable; server archives retained' }
$taskSshOptions = @('-i', "$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop", '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', "UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts_kws", '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'KexAlgorithms=curve25519-sha256', '-o', 'ConnectTimeout=10')
$taskManifestRaw = & ssh.exe -T @taskSshOptions 'kws-admin@187.7.70.230' "cat '$RemoteDirectory/manifest.json'"
if ($LASTEXITCODE -ne 0) { throw 'Encrypted export manifest unavailable' }
$taskManifest = $taskManifestRaw | ConvertFrom-Json
if (-not $taskManifest.encrypted_only -or $taskManifest.files.Count -ne 4) { throw 'Unexpected backup set' }
New-Item -ItemType Directory -Path $taskTarget -Force | Out-Null
foreach ($taskFile in $taskManifest.files) {
    if ($taskFile.name -notmatch '^(database|storage|video|cdn)-(precopy|final)-\d{8}T\d{6}Z\.tar(\.gz)?\.age$' -or $taskFile.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'Unexpected backup identity' }
    $taskPath = Join-Path $taskTarget $taskFile.name
    if (-not (Test-Path -LiteralPath $taskPath)) {
        $taskPartial = $taskPath + '.partial'
        & scp.exe @taskSshOptions "kws-admin@187.7.70.230:$RemoteDirectory/$($taskFile.name)" $taskPartial
        if ($LASTEXITCODE -ne 0) { throw 'Encrypted backup transfer interrupted; server archive retained' }
        if ((Get-Item -LiteralPath $taskPartial).Length -ne $taskFile.bytes -or (Get-FileHash -LiteralPath $taskPartial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskFile.sha256) { throw 'NAS transfer checksum mismatch' }
        Move-Item -LiteralPath $taskPartial -Destination $taskPath
    }
    if ((Get-Item -LiteralPath $taskPath).Length -ne $taskFile.bytes -or (Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskFile.sha256) { throw 'NAS archive checksum mismatch' }
    [pscustomobject]@{kind=$taskFile.kind; bytes=$taskFile.bytes; nas_sha256_verified=$true} | ConvertTo-Json -Compress
}
$taskManifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskTarget 'manifest.json') -Encoding utf8
[pscustomobject]@{independent_nas_copy_verified=$true; encrypted_archives=4; final_aligned_cutover_set=$false; destination=$taskTarget} | ConvertTo-Json -Compress
