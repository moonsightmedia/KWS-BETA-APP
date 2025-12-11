# Script zum Setzen des FCM_SERVICE_ACCOUNT_JSON Secrets als Base64
$jsonFile = "android/app/kws-beta-app-3ddf3b22c180.json"

if (-not (Test-Path $jsonFile)) {
    Write-Host "❌ Datei nicht gefunden: $jsonFile" -ForegroundColor Red
    exit 1
}

Write-Host "📖 Lese JSON-Datei..." -ForegroundColor Cyan
$jsonContent = Get-Content $jsonFile -Raw -Encoding UTF8

Write-Host "🔧 Kodiere als Base64..." -ForegroundColor Yellow
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
$base64 = [Convert]::ToBase64String($bytes)

Write-Host "🚀 Setze Secret als Base64..." -ForegroundColor Green
$command = "npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON=$base64"
Write-Host "Führe aus: npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON=<BASE64>" -ForegroundColor Gray
Invoke-Expression $command

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Secret erfolgreich als Base64 gesetzt!" -ForegroundColor Green
    Write-Host "`nDie Edge Function wird es automatisch dekodieren." -ForegroundColor White
} else {
    Write-Host "`n❌ Fehler beim Setzen des Secrets" -ForegroundColor Red
}

