param([ValidateSet('export-source-media.py','inventory-source-rest.py','inventory-storage-counts.py','verify-source-freeze.py')][string]$Tool = 'export-source-media.py',
      [ValidateSet('precopy','final')][string]$ExportStage = 'precopy')
$ErrorActionPreference = 'Stop'
$taskKnownHosts = Join-Path $env:USERPROFILE '.ssh\known_hosts_kws'
$taskSshArgs = @('-T','-i',"$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop",'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$taskKnownHosts",'-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','kws-admin@187.7.70.230')
& ssh.exe @taskSshArgs 'sudo -n install -d -m 700 /opt/kws/tools'
if ($LASTEXITCODE -ne 0) { throw 'Tool directory preparation failed' }
& scp.exe -i "$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$taskKnownHosts" -o HostKeyAlgorithms=ssh-ed25519 -o KexAlgorithms=curve25519-sha256 (Join-Path $PSScriptRoot $Tool) "kws-admin@187.7.70.230:/home/kws-admin/$Tool"
if ($LASTEXITCODE -ne 0) { throw 'Public migration tool transfer failed' }
& ssh.exe @taskSshArgs "sudo -n install -m 600 -o root -g root /home/kws-admin/$Tool /opt/kws/tools/$Tool"
if ($LASTEXITCODE -ne 0) { throw 'Protected migration tool installation failed' }
$taskRaw = & (Join-Path $env:LOCALAPPDATA 'JanoschAI\Bitwarden\Invoke-BwsDevice.ps1') -DeviceName codex-laptop secret get 91edbb17-c9dd-4e50-8300-b4a5009a2443 --output json
if ($LASTEXITCODE -ne 0) { throw 'Source credential unavailable' }
$taskSecret = $taskRaw | ConvertFrom-Json
$taskProcess = [Diagnostics.Process]::new()
$taskProcess.StartInfo.FileName = 'ssh.exe'
$taskProcess.StartInfo.UseShellExecute = $false
$taskProcess.StartInfo.CreateNoWindow = $true
$taskProcess.StartInfo.RedirectStandardInput = $true
foreach ($taskArg in $taskSshArgs) { $taskProcess.StartInfo.ArgumentList.Add($taskArg) }
$taskProcess.StartInfo.ArgumentList.Add("sudo -n python3 /opt/kws/tools/$Tool")
try {
    if (-not $taskProcess.Start()) { throw 'Migration process did not start' }
    $taskProcess.StandardInput.WriteLine((@{service_key=$taskSecret.value;export_stage=$ExportStage} | ConvertTo-Json -Compress))
    $taskProcess.StandardInput.Close()
    $taskProcess.WaitForExit()
    if ($taskProcess.ExitCode -ne 0) { throw 'Protected source API operation failed; inspect named checks before continuing' }
} finally {
    $taskSecret=$null; $taskRaw=$null; $taskProcess.Dispose()
}
