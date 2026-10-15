# Konten ab 16 und Löschanträge – Verifikation

Stand: 12. Oktober 2026. Web-Release `f37d7bd` auf dem KWS-VPS veröffentlicht.

## Verhalten

- Neue Registrierung benötigt ein gültiges Geburtsdatum; Grenze 16 nach deutschem Kalendertag. Zusätzlich serverseitiger Before-User-Created-Hook. Selbstauskunft, kein amtlicher Altersnachweis. 44 bestehende Konten nicht automatisch gesperrt oder gelöscht.
- Profil → Profil bearbeiten → Konto löschen: bestätigter Antrag mit unveränderlicher Frist von sieben Tagen. Zuständig Marketing; technische Bearbeitung nach `ops/hostinger/ACCOUNT_DELETION.md`. Geschützte Warteschlange im bestehenden Administrationsbereich, keine Löschrechte für App-Clients.
- Operator schützt fremde/gemeinsame Dateien und den letzten Administrator, verlangt einen geprüften Löschplan und gestoppte Video-Uploads. Daten-/Dateilöschung vor der Abschlussmail; unterbrochene Vorgänge bleiben erkennbar. Tatsächliche vollständige Löschung und Mailzustellung auf einem Wegwerfkonto noch nicht Ende zu Ende abgenommen.

## Prüfungen

- 162 Node-Tests bestanden, darunter Alters-/Kalendergrenzen, Authentifizierungs-Header und bestätigte Löschantwort. Neun Python-Prüfungen für Pfade, fremde Dateien, Blocker, Planänderungen, SMTP-Fehler und Wiederaufnahme bestanden.
- SQL-Probe mit synthetischen Konten vollständig zurückgerollt: eigener Antrag idempotent, Fremdzugriff und direkte Schreib-/Löschoperationen verweigert, anonyme/gelöschte Konten abgewiesen, besitzende Storage-Dateien blockieren voreilige Kontolöschung, FK-Löschkaskaden geprüft. Bestand unverändert: 44 Konten, 2.389 Storage-Dateien.
- Zwei visuelle Prüfrunden bei 375/768/1280/1920px für Registrierung, Profil, Adminwarteschlange und Boulder-Verwaltung. Lade-, Fehler-, Leer-, Bestätigungs- und Abbruchzustände, Geburtstag-/Dialogfokus geprüft. Kein horizontaler Überlauf. Nachweise unter `test-results/apple-store-2026-10-12/`.
- Live-Abnahme entdeckte fehlende Auth-Header der neuen Abfragen; korrigiert und durch Regressionstest abgesichert. Danach angemeldete Profilabfrage und echte leere Adminwarteschlange erfolgreich. Löschdialog geöffnet und abgebrochen; kein echter Antrag gestellt. Gastzugang zeigt alle 104 Boulder.
- Web-Build erfolgreich. TypeScript-Gesamtprüfung meldet weiterhin 76 vorbestehende Diagnosen; keine Diagnose in neuen Konto-Modulen oder `ProfileEdit`. Keine pauschale Behauptung einer fehlerfreien Gesamtanwendung. Vorhandene Map-Importkollision und falscher Profilbild-Callback-Parameter korrigiert.
- iOS-Build 84 erfolgreich erstellt und hochgeladen: GitHub-Run `38226836397`, Quellstand `f37d7bd`. IPA enthält API/Video/Recovery, Altersformular, Löschantrag und Warteschlange; 15 Assets auf private Zugangsdaten geprüft. Bundle `com.kletterwelt.beta`, Version 1.0, Build 84, iPhone/iPad. IPA-SHA256: `FEF85A3EEDBE5AA8C4919BB1DA03D1F61FECE172695521F2CDCFEE02D7652503`. Geräteinstallation nicht verifiziert.
- Zwischenbuild 83 war vor dem CI-Abbruch bereits hochgeladen und automatisch intern zugeordnet. Nach Live-Abnahme zurückgezogen; Apple zeigt **Abgelaufen**. Build 82 bleibt erhalten.

## Sicherung

Neue verschlüsselte Gesamtsicherung `20261012T085928Z.tar.age`: 4.258 Dateien entschlüsselt und hashgeprüft, alle 2.389 Storage-Versionen und 448 Medienreferenzen vorhanden. Wiederherstellung in isolierter Datenbank `kws_backup_restore_20261012_090225`: 74 Tabellen, 17.625 Zeilen und zwei Sequenzen exakt verglichen; Vault-Entschlüsselung geprüft. Produktionsdatenbank unverändert.

Löschvermerke und noch ausstehende Mailbestätigungen werden geschützt mitgesichert. Vor Freigabe einer später wiederhergestellten Umgebung aktuelle Löschvermerke auch gegen wiederhergestellte Medien abgleichen. Diese Wiederanwendung wurde mangels tatsächlich gelöschter Konten noch nicht vollständig geprobt.

Eine unabhängige Kopie dieser neuen Sicherung außerhalb des VPS ist nicht bestätigt. NAS ist erreichbar, der direkte SSH-Transport vom Laptop zum VPS derzeit nicht. Keine Firewall-Freigaben erweitert.

## Noch offen

Native Geräteabnahme einschließlich tatsächlicher Kontolöschung mit Bestätigung, verlässlicher täglicher Marketing-/Operatorablauf, Moderation/Melden/Sperren, App-Datenschutz, Store-Screenshots und Review-Zugang. Apple-Organisation/DSA noch nicht abgeschlossen; iOS-Push weiterhin offen. Keine öffentliche App-Store-Einreichung in diesem Schritt.
