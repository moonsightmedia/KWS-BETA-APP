#!/bin/bash
# Script zum Setzen des FCM Service Account JSON als Supabase Secret
# Bash Script für Linux/Mac

echo ""
echo "=== FCM Service Account JSON als Supabase Secret setzen ==="

# Pfad zur JSON-Datei
JSON_PATH="android/app/kws-beta-app-3ddf3b22c180.json"

# Prüfe ob Datei existiert
if [ ! -f "$JSON_PATH" ]; then
    echo ""
    echo "❌ Fehler: JSON-Datei nicht gefunden: $JSON_PATH"
    echo "Bitte stelle sicher, dass die Datei existiert."
    exit 1
fi

# Prüfe ob supabase CLI installiert ist
echo ""
echo "🔍 Prüfe Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo ""
    echo "❌ Fehler: Supabase CLI nicht gefunden"
    echo "Bitte installiere Supabase CLI:"
    echo "  npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI gefunden"

# Lese JSON-Datei
echo ""
echo "📄 Lese JSON-Datei..."
JSON_CONTENT=$(cat "$JSON_PATH")

# Prüfe ob JSON gültig ist
if ! echo "$JSON_CONTENT" | jq . > /dev/null 2>&1; then
    echo ""
    echo "❌ Fehler: JSON-Datei ist ungültig"
    exit 1
fi

echo "✅ JSON-Datei ist gültig"

# Setze Secret
echo ""
echo "📤 Setze FCM_SERVICE_ACCOUNT_JSON als Supabase Secret..."
echo "Dies kann einen Moment dauern..."

# Escape JSON für Bash (Anführungszeichen müssen escaped werden)
ESCAPED_JSON=$(echo "$JSON_CONTENT" | sed "s/'/'\"'\"'/g")

# Setze Secret
if supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$JSON_CONTENT"; then
    echo ""
    echo "✅ FCM_SERVICE_ACCOUNT_JSON erfolgreich als Supabase Secret gesetzt!"
    echo ""
    echo "📋 Nächste Schritte:"
    echo "   1. Edge Function deployen:"
    echo "      supabase functions deploy send-push-notification"
    echo "   2. Test-Button im Browser klicken"
    echo "   3. Prüfe Console-Logs"
else
    echo ""
    echo "❌ Fehler beim Setzen des Secrets"
    echo ""
    echo "💡 Alternative: Manuell setzen:"
    echo "   supabase secrets set FCM_SERVICE_ACCOUNT_JSON='<JSON-Inhalt>'"
    exit 1
fi

echo ""

