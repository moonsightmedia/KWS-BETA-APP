# Script zum Setzen des FCM_SERVICE_ACCOUNT_JSON Secrets
$jsonFile = "android/app/kws-beta-app-3ddf3b22c180.json"

if (-not (Test-Path $jsonFile)) {
    Write-Host "❌ Datei nicht gefunden: $jsonFile" -ForegroundColor Red
    exit 1
}

Write-Host "📖 Lese JSON-Datei..." -ForegroundColor Cyan
$jsonContent = Get-Content $jsonFile -Raw -Encoding UTF8

Write-Host "🔧 Setze Secret..." -ForegroundColor Yellow
# Supabase secrets set erwartet NAME=VALUE Format
# Der JSON muss als String übergeben werden, daher müssen wir ihn escapen
$jsonEscaped = $jsonContent -replace '"', '\"'
$jsonEscaped = $jsonEscaped -replace '`n', '\n'
$jsonEscaped = $jsonEscaped -replace '`r', ''

# Führe den Befehl aus
$command = "npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON=`"$jsonEscaped`""
Write-Host "🚀 Führe aus: $command" -ForegroundColor Green
Invoke-Expression $command

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Secret erfolgreich gesetzt!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Fehler beim Setzen des Secrets" -ForegroundColor Red
    Write-Host "Bitte manuell setzen mit:" -ForegroundColor Yellow
    Write-Host "   npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON='<JSON_INHALT>'" -ForegroundColor Cyan
}

