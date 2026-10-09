$ErrorActionPreference='Stop'
$taskBridge=Join-Path $env:LOCALAPPDATA 'JanoschAI\KwsMigrationTransfer\private-ui-account.json'
if (Test-Path -LiteralPath $taskBridge) {throw 'UI bridge already exists'}
$taskSshArgs=@('-T','-i',"$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop",'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts_kws",'-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','kws-admin@187.7.70.230')
$taskProcess=[Diagnostics.Process]::new()
$taskProcess.StartInfo.FileName='ssh.exe';$taskProcess.StartInfo.UseShellExecute=$false;$taskProcess.StartInfo.CreateNoWindow=$true
$taskProcess.StartInfo.RedirectStandardInput=$true;$taskProcess.StartInfo.RedirectStandardOutput=$true;$taskProcess.StartInfo.RedirectStandardError=$true
foreach($taskArg in $taskSshArgs){$taskProcess.StartInfo.ArgumentList.Add($taskArg)}
$taskProcess.StartInfo.ArgumentList.Add('sudo -n bash -c ''script=$(cat); bash -c "$script"''')
try {
 if(-not $taskProcess.Start()){throw 'Private account preparation failed'}
 $taskOut=$taskProcess.StandardOutput.ReadToEndAsync();$taskErr=$taskProcess.StandardError.ReadToEndAsync()
 $taskProcess.StandardInput.Write([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'prepare-private-ui-account.sh')).Replace("`r`n","`n"));$taskProcess.StandardInput.Close();$taskProcess.WaitForExit()
 $null=$taskErr.GetAwaiter().GetResult()
 if($taskProcess.ExitCode -ne 0){throw 'Private account preparation failed; protected details withheld'}
 $taskData=$taskOut.GetAwaiter().GetResult()|ConvertFrom-Json
 if($taskData.database -ne 'kws_restore_probe_20261008_121055' -or -not $taskData.password){throw 'Wrong private database'}
 [IO.File]::WriteAllText($taskBridge,($taskData|ConvertTo-Json -Compress))
 Write-Output 'DISPOSABLE_PRIVATE_UI_ACCOUNT_PREPARED_WITHOUT_LOGGING_CREDENTIALS'
} finally {$taskData=$null;$taskOut=$null;$taskProcess.Dispose()}
