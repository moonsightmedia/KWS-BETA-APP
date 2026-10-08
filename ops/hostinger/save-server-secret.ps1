[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('KWS_HOSTINGER_SUPABASE_CONFIG','KWS_HOSTINGER_MIGRATION_AGE_IDENTITY')][string]$Reference
)
$ErrorActionPreference = 'Stop'
$taskWrapper = Join-Path $env:LOCALAPPDATA 'JanoschAI\Bitwarden\Invoke-BwsDevice.ps1'
$taskExistingRaw = & $taskWrapper -DeviceName codex-laptop secret list --output json
if ($LASTEXITCODE -ne 0) { throw 'Bitwarden reference lookup failed' }
$taskExisting = @($taskExistingRaw | ConvertFrom-Json | Where-Object { $_.key -eq $Reference })
$taskExistingRaw = $null
if ($taskExisting.Count -gt 0) { throw 'Reference already exists; refusing to overwrite' }
$taskPath = if ($Reference -eq 'KWS_HOSTINGER_SUPABASE_CONFIG') { '/opt/kws/supabase/runtime/.env' } else { '/root/.config/kws-migration/age-key.txt' }
$taskKnownHosts = Join-Path $env:USERPROFILE '.ssh\known_hosts_kws'
$taskLines = & ssh.exe -T -i "$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$taskKnownHosts" -o HostKeyAlgorithms=ssh-ed25519 -o KexAlgorithms=curve25519-sha256 kws-admin@187.7.70.230 "sudo -n cat $taskPath"
if ($LASTEXITCODE -ne 0) { throw 'Protected server configuration could not be read' }
$taskValue = ($taskLines -join "`n") + "`n"
try {
  & $taskWrapper -DeviceName codex-laptop secret create --output none "--note=KWS Hostinger migration recovery material; administrator use only; never display the value." $Reference $taskValue ce3eaee7-9c07-4218-b506-b49300dd383e
  if ($LASTEXITCODE -ne 0) { throw 'Protected configuration could not be saved to Bitwarden' }
  $taskVerifyRaw = & $taskWrapper -DeviceName codex-laptop secret list --output json
  if ($LASTEXITCODE -ne 0) { throw 'Bitwarden reference verification failed' }
  $taskMatch = @($taskVerifyRaw | ConvertFrom-Json | Where-Object { $_.key -eq $Reference })
  if ($taskMatch.Count -ne 1 -or $taskMatch[0].value -cne $taskValue) { throw 'Stored configuration verification failed' }
  Write-Output "BITWARDEN_VERIFIED: AI Shared/$Reference"
} finally {
  $taskValue = $null; $taskLines = $null; $taskMatch = $null; $taskVerifyRaw = $null
}
