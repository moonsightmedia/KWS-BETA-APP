[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskReference = 'KWS_SUPABASE_DB_PASSWORD'
$taskWrapper = Join-Path $env:LOCALAPPDATA 'JanoschAI\Bitwarden\Invoke-BwsDevice.ps1'
$taskHelper = 'C:\Users\Janosch\Documents\AI-Knowledge\99 System\Scripts\Add-AISecret.ps1'
$taskExistingRaw = & $taskWrapper -DeviceName codex-laptop secret list --output json
if ($LASTEXITCODE -ne 0) { throw 'Bitwarden lookup failed' }
$taskExists = @($taskExistingRaw | ConvertFrom-Json | Where-Object key -eq $taskReference).Count
$taskExistingRaw = $null
if ($taskExists -gt 0) { throw 'This reference already exists; refusing to replace it.' }
$Host.UI.RawUI.WindowTitle = 'KWS - neues Datenbankpasswort sicher speichern'
Write-Host 'Bitte zuerst im offenen Supabase-Formular ein NEUES Datenbankpasswort setzen.'
Write-Host 'Danach dasselbe neue Passwort hier eingeben. Die Eingabe ist verborgen.'
Write-Host 'Kein Passwort in den Chat senden.'
& $taskHelper -Key $taskReference -DeviceName codex-laptop -Note 'KWS source PostgreSQL password for authorized encrypted migration export; do not log or display.'
Write-Host 'Gespeichert als AI Shared/KWS_SUPABASE_DB_PASSWORD.'
Write-Host 'Du kannst im Chat jetzt einfach fertig schreiben.'
