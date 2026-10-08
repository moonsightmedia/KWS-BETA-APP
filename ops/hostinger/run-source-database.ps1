param([ValidateSet('export-source-database.py','compare-source-database-metadata.py')][string]$Tool='export-source-database.py')
$ErrorActionPreference='Stop'
$taskKnownHosts=Join-Path $env:USERPROFILE '.ssh\known_hosts_kws'
$taskSshArgs=@('-T','-i',"$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop",'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$taskKnownHosts",'-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','kws-admin@187.7.70.230')
& scp.exe -i "$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$taskKnownHosts" -o HostKeyAlgorithms=ssh-ed25519 -o KexAlgorithms=curve25519-sha256 (Join-Path $PSScriptRoot $Tool) "kws-admin@187.7.70.230:/home/kws-admin/$Tool"
if ($LASTEXITCODE -ne 0) {throw 'Public tool transfer failed'}
& ssh.exe @taskSshArgs "sudo -n install -m 600 -o root -g root /home/kws-admin/$Tool /opt/kws/tools/$Tool"
if ($LASTEXITCODE -ne 0) {throw 'Protected tool installation failed'}
$taskRaw=& (Join-Path $env:LOCALAPPDATA 'JanoschAI\Bitwarden\Invoke-BwsDevice.ps1') -DeviceName codex-laptop secret get f9569ba4-0e66-46ce-8425-b4dd00c499a6 --output json
if ($LASTEXITCODE -ne 0) {throw 'Protected source DB credential unavailable'}
$taskSecret=$taskRaw | ConvertFrom-Json
$taskProcess=[Diagnostics.Process]::new()
$taskProcess.StartInfo.FileName='ssh.exe'
$taskProcess.StartInfo.UseShellExecute=$false
$taskProcess.StartInfo.CreateNoWindow=$true
$taskProcess.StartInfo.RedirectStandardInput=$true
$taskProcess.StartInfo.RedirectStandardOutput=$true
$taskProcess.StartInfo.RedirectStandardError=$true
foreach ($taskArg in $taskSshArgs) {$taskProcess.StartInfo.ArgumentList.Add($taskArg)}
$taskProcess.StartInfo.ArgumentList.Add("sudo -n python3 /opt/kws/tools/$Tool")
try {
    if (-not $taskProcess.Start()) {throw 'Source DB operation did not start'}
    $taskStdout=$taskProcess.StandardOutput.ReadToEndAsync()
    $taskStderr=$taskProcess.StandardError.ReadToEndAsync()
    $taskProcess.StandardInput.WriteLine((@{password=$taskSecret.value}|ConvertTo-Json -Compress))
    $taskProcess.StandardInput.Close()
    $taskProcess.WaitForExit()
    Write-Output $taskStdout.GetAwaiter().GetResult()
    # Do not surface raw remote diagnostics that may include sensitive SQL.
    $null=$taskStderr.GetAwaiter().GetResult()
    if ($taskProcess.ExitCode -ne 0) {throw 'Source DB operation failed; inspect protected diagnostic classifications'}
} finally {
    $taskSecret=$null;$taskRaw=$null;$taskProcess.Dispose()
}
