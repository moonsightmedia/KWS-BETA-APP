[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskWrapper = Join-Path $env:LOCALAPPDATA 'JanoschAI\Bitwarden\Invoke-BwsDevice.ps1'
$taskRaw = & $taskWrapper -DeviceName codex-laptop secret get e7d39de8-444a-4a66-b3ad-b4dd00b38158 --output json
if ($LASTEXITCODE -ne 0) { throw 'Dashboard credential unavailable in Bitwarden' }
$taskSecret = ($taskRaw | ConvertFrom-Json).value
$taskMatch = [regex]::Match($taskSecret, '(?m)^DASHBOARD_PASSWORD=([^\r\n]+)$')
if (-not $taskMatch.Success) { throw 'Dashboard credential absent; refusing to copy a different password' }
Set-Clipboard -Value $taskMatch.Groups[1].Value
$taskSecret = $null
$taskRaw = $null
$taskMatch = $null
Write-Output 'Supabase dashboard password copied. Username: kws-admin. No credential was printed.'
