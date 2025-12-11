# FCM Token ungültig - Lösung

## Problem
Die Fehlermeldung `UNREGISTERED` oder `INVALID_ARGUMENT` bedeutet, dass das FCM Token ungültig ist.

## Ursachen
- App wurde neu installiert
- Token wurde zurückgesetzt
- Token wurde nie richtig registriert
- App-Daten wurden gelöscht

## Automatische Lösung
Die App löscht ungültige Tokens automatisch, wenn sie erkannt werden.

## Manuelle Lösung

### Schritt 1: Token auf dem Handy neu registrieren
1. Öffne die App auf dem Handy
2. Gehe zu: **Profil** > **Push-Benachrichtigungen**
3. Deaktiviere Push-Benachrichtigungen (falls aktiviert)
4. Aktiviere Push-Benachrichtigungen erneut
5. Warte bis das neue Token registriert ist

### Schritt 2: Testen
1. Gehe im Browser zum Dashboard
2. Klicke auf den **Test-Button** (Glocke-Icon)
3. Die Push-Benachrichtigung sollte jetzt am Handy ankommen

## Token manuell löschen (falls nötig)

Falls das Token nicht automatisch gelöscht wird:

1. Öffne die Supabase Console
2. Gehe zu: **Table Editor** > **push_tokens**
3. Suche nach dem ungültigen Token
4. Lösche den Eintrag manuell

## Verhindern von ungültigen Tokens

- Stelle sicher, dass die App nicht neu installiert wird, ohne das Token zu löschen
- Implementiere eine Token-Validierung beim App-Start
- Regelmäßige Token-Erneuerung (falls nötig)

