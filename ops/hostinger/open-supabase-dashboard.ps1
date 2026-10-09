[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'

# Local access to the existing authenticated Studio; no public port or DNS change.
$taskPort = 18000
$taskBinding = '127.0.0.1:18000:127.0.0.1:8000'
$taskDestination = 'kws-admin@187.7.70.230'
$taskListener = @(Get-NetTCPConnection -LocalPort $taskPort -State Listen -ErrorAction SilentlyContinue)
if ($taskListener.Count -gt 0) {
  foreach ($taskConnection in $taskListener) {
    $taskOwner = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskConnection.OwningProcess)"
    if ($taskConnection.LocalAddress -ne '127.0.0.1' -or $taskOwner.Name -ne 'ssh.exe' -or
        -not $taskOwner.CommandLine.Contains($taskBinding) -or
        -not $taskOwner.CommandLine.Contains($taskDestination)) {
      throw 'Dashboard port is occupied by another process; refusing to replace it'
    }
  }
  $taskPid = $taskListener[0].OwningProcess
} else {
  $taskArguments = @('-N', '-T', '-i', "$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop",
    '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
    '-o', "UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts_kws",
    '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'KexAlgorithms=curve25519-sha256',
    '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30',
    '-L', $taskBinding, $taskDestination)
  $taskProcess = Start-Process -FilePath 'ssh.exe' -ArgumentList $taskArguments -WindowStyle Hidden -PassThru
  $taskPid = $taskProcess.Id
}

$taskVerified = $false
for ($taskAttempt = 0; $taskAttempt -lt 15; $taskAttempt++) {
  try {
    $taskResponse = Invoke-WebRequest -Uri "http://127.0.0.1:$taskPort/" -SkipHttpErrorCheck -TimeoutSec 3
    if ([int]$taskResponse.StatusCode -ne 401) { throw 'Expected authenticated dashboard challenge' }
    $taskVerified = $true
    break
  } catch {
    if (-not (Get-Process -Id $taskPid -ErrorAction SilentlyContinue)) { throw 'Dashboard tunnel exited' }
    Start-Sleep -Milliseconds 300
  }
}
if (-not $taskVerified) { throw 'Dashboard tunnel could not be verified' }
[pscustomobject]@{
  Url = "http://127.0.0.1:$taskPort/"
  Username = 'kws-admin'
  PasswordReference = 'AI Shared/KWS_HOSTINGER_SUPABASE_CONFIG -> DASHBOARD_PASSWORD'
  TunnelProcessId = $taskPid
  AuthenticationRequired = $true
  PublicServerExposure = $false
} | ConvertTo-Json
