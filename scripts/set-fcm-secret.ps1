# Script zum Setzen des FCM Service Account JSON als Supabase Secret
# PowerShell Script für Windows

Write-Host ""
Write-Host "=== FCM Service Account JSON als Supabase Secret setzen ===" -ForegroundColor Cyan

# Pfad zur JSON-Datei
$jsonPath = "android\app\kws-beta-app-3ddf3b22c180.json"

# Prüfe ob Datei existiert
if (-not (Test-Path $jsonPath)) {
    Write-Host ""
    Write-Host "Fehler: JSON-Datei nicht gefunden: $jsonPath" -ForegroundColor Red
    Write-Host "Bitte stelle sicher, dass die Datei existiert." -ForegroundColor Yellow
    exit 1
}

# Lese JSON-Datei
Write-Host ""
Write-Host "Lese JSON-Datei..." -ForegroundColor Yellow
$jsonContent = Get-Content $jsonPath -Raw

# Prüfe ob Inhalt gültig ist
try {
    $jsonObject = $jsonContent | ConvertFrom-Json
    Write-Host "JSON-Datei ist gueltig" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "Fehler: JSON-Datei ist ungueltig" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Prüfe ob supabase CLI installiert ist
Write-Host ""
Write-Host "Pruefe Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "Supabase CLI gefunden" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "Fehler: Supabase CLI nicht gefunden" -ForegroundColor Red
    Write-Host "Bitte installiere Supabase CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    exit 1
}

# Setze Secret
Write-Host ""
Write-Host "Setze FCM_SERVICE_ACCOUNT_JSON als Supabase Secret..." -ForegroundColor Yellow
Write-Host "Dies kann einen Moment dauern..." -ForegroundColor Gray

# Erstelle temporäre Datei für den JSON-Inhalt
$tempFile = [System.IO.Path]::GetTempFileName()
$jsonContent | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

try {
    # Lese JSON aus temporärer Datei
    $jsonForCommand = Get-Content $tempFile -Raw
    
    # Erstelle den Befehl - verwende hier base64 encoding um Probleme mit Sonderzeichen zu vermeiden
    # Oder verwende eine andere Methode
    
    # Versuche direkt mit dem JSON-String
    $jsonEscaped = $jsonForCommand -replace '"', '\"'
    
    Write-Host ""
    Write-Host "Fuehre Befehl aus..." -ForegroundColor Yellow
    
    # Verwende base64 encoding für den JSON-Inhalt
    $jsonBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($jsonForCommand))
    
    # Alternative: Verwende die JSON-Datei direkt
    # Supabase CLI unterstützt möglicherweise --file flag
    
    # Versuche es mit dem direkten Befehl
    $command = "supabase secrets set FCM_SERVICE_ACCOUNT_JSON=`"$jsonForCommand`""
    
    # Führe Befehl aus
    Invoke-Expression $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "FCM_SERVICE_ACCOUNT_JSON erfolgreich als Supabase Secret gesetzt!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Naechste Schritte:" -ForegroundColor Cyan
        Write-Host "   1. Edge Function deployen:" -ForegroundColor White
        Write-Host "      supabase functions deploy send-push-notification" -ForegroundColor Gray
        Write-Host "   2. Test-Button im Browser klicken" -ForegroundColor White
        Write-Host "   3. Pruefe Console-Logs" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "Fehler beim Setzen des Secrets" -ForegroundColor Red
        Write-Host "Exit Code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Manuell setzen:" -ForegroundColor Yellow
        Write-Host "   supabase secrets set FCM_SERVICE_ACCOUNT_JSON=`"<JSON-Inhalt>`"" -ForegroundColor White
    }
} catch {
    Write-Host ""
    Write-Host "Fehler beim Ausfuehren des Befehls:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Manuell setzen:" -ForegroundColor Yellow
    Write-Host "   1. Kopiere den Inhalt der JSON-Datei" -ForegroundColor White
    Write-Host "   2. Fuehre aus:" -ForegroundColor White
    Write-Host "      supabase secrets set FCM_SERVICE_ACCOUNT_JSON=`"<JSON-Inhalt>`"" -ForegroundColor Gray
} finally {
    # Lösche temporäre Datei
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}

Write-Host ""
