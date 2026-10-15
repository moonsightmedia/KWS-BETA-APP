$ErrorActionPreference='Stop'
$taskSshArgs=@('-T','-i',"$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop",'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts_kws",'-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','kws-admin@187.7.70.230')
& scp.exe -i "$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts_kws" -o HostKeyAlgorithms=ssh-ed25519 -o KexAlgorithms=curve25519-sha256 (Join-Path $PSScriptRoot 'prepare-integrations.py') 'kws-admin@187.7.70.230:/home/kws-admin/prepare-integrations.py'
if ($LASTEXITCODE -ne 0) {throw 'Integration tool transfer failed'}
& ssh.exe @taskSshArgs 'sudo -n install -m 600 -o root -g root /home/kws-admin/prepare-integrations.py /opt/kws/tools/prepare-integrations.py'
if ($LASTEXITCODE -ne 0) {throw 'Integration tool installation failed'}
$taskWrapper=Join-Path $env:LOCALAPPDATA 'JanoschAI\Bitwarden\Invoke-BwsDevice.ps1'
$taskSmtpRaw=& $taskWrapper -DeviceName codex-laptop secret get 0852bb44-06d5-4351-b1f9-b4de00971b77 --output json
if ($LASTEXITCODE -ne 0) {throw 'SMTP credential unavailable'}
$taskFcmRaw=& $taskWrapper -DeviceName codex-laptop secret get 2d870e11-68a4-4748-a819-b4de00970023 --output json
if ($LASTEXITCODE -ne 0) {throw 'FCM credential unavailable'}
$taskProcess=[Diagnostics.Process]::new()
$taskProcess.StartInfo.FileName='ssh.exe'
$taskProcess.StartInfo.UseShellExecute=$false
$taskProcess.StartInfo.CreateNoWindow=$true
$taskProcess.StartInfo.RedirectStandardInput=$true
$taskProcess.StartInfo.RedirectStandardOutput=$true
$taskProcess.StartInfo.RedirectStandardError=$true
foreach ($taskArg in $taskSshArgs) {$taskProcess.StartInfo.ArgumentList.Add($taskArg)}
$taskProcess.StartInfo.ArgumentList.Add('sudo -n python3 /opt/kws/tools/prepare-integrations.py')
try {
    if (-not $taskProcess.Start()) {throw 'Integration preparation did not start'}
    $taskOut=$taskProcess.StandardOutput.ReadToEndAsync()
    $taskErr=$taskProcess.StandardError.ReadToEndAsync()
    $taskProcess.StandardInput.WriteLine((@{smtp=($taskSmtpRaw|ConvertFrom-Json).value;fcm=($taskFcmRaw|ConvertFrom-Json).value}|ConvertTo-Json -Compress))
    $taskProcess.StandardInput.Close()
    $taskProcess.WaitForExit()
    Write-Output $taskOut.GetAwaiter().GetResult()
    $null=$taskErr.GetAwaiter().GetResult()
    if ($taskProcess.ExitCode -ne 0) {throw 'Integration verification failed; protected diagnostics only'}
} finally {$taskSmtpRaw=$null;$taskFcmRaw=$null;$taskProcess.Dispose()}
