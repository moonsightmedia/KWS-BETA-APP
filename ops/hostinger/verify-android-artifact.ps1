param([ValidateSet('android','ios')][string]$Platform='android')
$ErrorActionPreference='Stop'
$taskWrapper=Join-Path $env:LOCALAPPDATA 'JanoschAI\Bitwarden\Invoke-BwsDevice.ps1'
$taskRaw=& $taskWrapper -DeviceName codex-laptop secret get e7d39de8-444a-4a66-b3ad-b4dd00b38158 --output json
if($LASTEXITCODE -ne 0){throw 'Protected verification material unavailable'}
$taskEnvironment=@{}
foreach($taskLine in ($taskRaw|ConvertFrom-Json).value.Split("`n")){
 if($taskLine -match '^([A-Z_]+)=(.*)$'){$taskEnvironment[$Matches[1]]=$Matches[2].Trim("`r",'"',"'")}
}
$taskFcmRaw=& $taskWrapper -DeviceName codex-laptop secret get 2d870e11-68a4-4748-a819-b4de00970023 --output json
if($LASTEXITCODE -ne 0){throw 'Protected FCM verification material unavailable'}
$taskPrivateKey=(($taskFcmRaw|ConvertFrom-Json).value|ConvertFrom-Json).private_key
$taskSecrets=@($taskEnvironment['SERVICE_ROLE_KEY'],$taskEnvironment['POSTGRES_PASSWORD'],$taskPrivateKey)
if(@($taskSecrets | Where-Object {[string]::IsNullOrWhiteSpace($_)}).Count){throw 'Verification material incomplete'}
$taskRelative=if($Platform -eq 'ios'){'..\..\output\hostinger-cutover\ios-81\App.ipa'}else{'..\..\output\hostinger-cutover\KWS-Beta-Hostinger-1.0.53.apk'}
$taskApk=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot $taskRelative)).Path
$taskZip=[IO.Compression.ZipFile]::OpenRead($taskApk)
$taskCount=0;$taskHasApi=$false;$taskHasVideo=$false;$taskHasRecovery=$false
try {
 foreach($taskEntry in $taskZip.Entries){
  if($Platform -eq 'android' -and -not $taskEntry.FullName.StartsWith('assets/')){continue}
  if($Platform -eq 'ios' -and -not $taskEntry.FullName.Contains('/public/')){continue}
  if($taskEntry.Length -eq 0){continue}
  $taskReader=[IO.StreamReader]::new($taskEntry.Open())
  try{$taskContent=$taskReader.ReadToEnd()}finally{$taskReader.Dispose()}
  foreach($taskSecret in $taskSecrets){if($taskContent.Contains($taskSecret)){throw 'Private credential detected in artifact; do not distribute'}}
  if($taskContent.Contains('-----BEGIN PRIVATE KEY-----')){throw 'Private key marker detected in artifact'}
  $taskHasApi=$taskHasApi -or $taskContent.Contains('https://beta-api.kletterwelt-sauerland.de')
  $taskHasVideo=$taskHasVideo -or $taskContent.Contains('https://video.kletterwelt-sauerland.de')
  $taskHasRecovery=$taskHasRecovery -or $taskContent.Contains('Neues Passwort festlegen')
  $taskCount++
 }
 if(-not($taskHasApi -and $taskHasVideo -and $taskHasRecovery)){throw 'Artifact endpoint or recovery form missing'}
 $taskReport=[ordered]@{Platform=$Platform;AssetsChecked=$taskCount;PrivateCredentialFound=$false;NewApiPresent=$taskHasApi;VideoEndpointPresent=$taskHasVideo;RecoveryFormPresent=$taskHasRecovery;Sha256=(Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash;InstalledOnDevice=$false;PublicCutover=$false}
 $taskReportName=if($Platform -eq 'ios'){'IPA-VERIFIED.json'}else{'APK-VERIFIED.json'}
 $taskReport|ConvertTo-Json|Set-Content -LiteralPath (Join-Path (Split-Path $taskApk) $taskReportName)
 $taskReport|ConvertTo-Json -Compress
} finally {$taskZip.Dispose();$taskRaw=$null;$taskFcmRaw=$null;$taskPrivateKey=$null;$taskEnvironment=$null;$taskSecrets=$null;$taskContent=$null}
