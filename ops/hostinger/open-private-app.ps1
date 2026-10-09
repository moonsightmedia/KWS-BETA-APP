[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskBinding = '127.0.0.1:9090:127.0.0.1:9090'
$taskDestination = 'kws-admin@187.7.70.230'
$taskListeners = @(Get-NetTCPConnection -LocalPort 9090 -State Listen -ErrorAction SilentlyContinue)
if ($taskListeners.Count) {
  foreach ($taskConnection in $taskListeners) {
    $taskOwner = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskConnection.OwningProcess)"
    if ($taskConnection.LocalAddress -ne '127.0.0.1' -or $taskOwner.Name -ne 'ssh.exe' -or
        -not $taskOwner.CommandLine.Contains($taskBinding) -or -not $taskOwner.CommandLine.Contains($taskDestination)) {
      throw 'Private app port belongs to another process; refusing to replace it'
    }
  }
  $taskPid = $taskListeners[0].OwningProcess
} else {
  $taskArguments = @('-N','-T','-i',"$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop",
    '-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes',
    '-o',"UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts_kws",
    '-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256',
    '-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3',
    '-L',$taskBinding,$taskDestination)
  $taskProcess = Start-Process -FilePath 'ssh.exe' -ArgumentList $taskArguments -WindowStyle Hidden -PassThru
  $taskPid = $taskProcess.Id
}
$taskVerified = $false
for ($taskAttempt=0; $taskAttempt -lt 20; $taskAttempt++) {
  try {
    $taskResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:9090/auth/v1/health' -TimeoutSec 3
    if ([int]$taskResponse.StatusCode -eq 200) { $taskVerified=$true; break }
  } catch {
    if (-not (Get-Process -Id $taskPid -ErrorAction SilentlyContinue)) { throw 'Private app tunnel exited' }
    Start-Sleep -Milliseconds 300
  }
}
if (-not $taskVerified) { throw 'Private app tunnel did not respond' }
[pscustomobject]@{Url='http://127.0.0.1:9090';TunnelProcessId=$taskPid;PublicCutover=$false}|ConvertTo-Json
