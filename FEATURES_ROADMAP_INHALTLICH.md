# KWS Beta App - Features & Entwicklungs-Roadmap (Inhaltlich)

**Stand:** Februar 2026  
**Version:** 1.0.68

---

## 📋 Inhaltsverzeichnis

1. [Kritische Aufgaben (Sofort)](#kritische-aufgaben-sofort)
2. [Geplante Features (Kurzfristig)](#geplante-features-kurzfristig)
3. [Geplante Features (Mittelfristig)](#geplante-features-mittelfristig)
4. [Geplante Features (Langfristig)](#geplante-features-langfristig)
5. [Technische Verbesserungen](#technische-verbesserungen)
6. [Code-Qualität & Refactoring](#code-qualität--refactoring)
7. [UX-Verbesserungen](#ux-verbesserungen)
8. [Bekannte Probleme & Limitationen](#bekannte-probleme--limitationen)
9. [User Stories & Use Cases](#user-stories--use-cases)
10. [Anforderungen & Spezifikationen](#anforderungen--spezifikationen)

---

## 🚨 Kritische Aufgaben (Sofort)

### 1. Wettkampf-Modus reaktivieren
**Status:** ⏳ Code vorhanden, aber UI ausgeblendet  
**Priorität:** Hoch  
**Aufwand:** Mittel (4-6 Stunden)  
**Geschätzte Zeit:** 1 Tag

#### Problembeschreibung
Die komplette Wettkampf-Funktionalität ist bereits implementiert und getestet. Allerdings wurde die Benutzeroberfläche vorübergehend deaktiviert, sodass alle Besucher der Wettkampf-Seite automatisch zur Startseite weitergeleitet werden. Der Code ist vollständig vorhanden und funktionsfähig, muss nur wieder aktiviert werden.

#### Was muss gemacht werden

**Technische Aktivierung:**
- Die Redirect-Logik in der Competition-Seite entfernen
- Alle auskommentierten Imports und Komponenten wieder aktivieren
- Die vollständige Wettkampf-Benutzeroberfläche wiederherstellen
- Route-Konfiguration prüfen (ist bereits vorhanden)

**Funktionalitätsprüfung:**
- Alle Wettkampf-Komponenten auf Funktionalität testen
- Ergebnis-Eingabe-Funktion prüfen
- Rangliste-Anzeige testen
- Admin-Funktionen für Wettkampf-Verwaltung prüfen
- Mobile-Ansicht testen

**Datenbank-Status:**
- Prüfen ob alle benötigten Tabellen existieren (competition_boulders, competition_participants, competition_results)
- Migrationen sind bereits vorhanden und müssen nur verifiziert werden

**UI/UX-Anpassungen:**
- Mobile-Responsiveness prüfen und ggf. optimieren
- Loading-States während Datenladevorgängen verbessern
- Fehlerbehandlung für Edge-Cases verbessern
- Toast-Benachrichtigungen für wichtige Aktionen hinzufügen

#### User Stories

**Als Wettkampf-Teilnehmer möchte ich:**
- Mich für einen Wettkampf registrieren können
- Meine Ergebnisse eingeben können (Flash, Top, Zone, None)
- Die Live-Rangliste einsehen können
- Meine Ergebnisse nachträglich bearbeiten können
- Die Rangliste nach Geschlecht filtern können

**Als Admin möchte ich:**
- Wettkampf-Boulders zuweisen können
- Teilnehmer verwalten können
- Ergebnisse bearbeiten können
- Teilnehmer löschen können

#### Akzeptanzkriterien
- Wettkampf-Seite ist unter `/competition` erreichbar
- User können sich als Teilnehmer registrieren
- Ergebnisse können eingegeben werden (Flash/Top/Zone/None)
- Rangliste wird korrekt angezeigt und aktualisiert
- Filter nach Geschlecht funktioniert
- Admin kann alle Verwaltungsfunktionen nutzen
- Mobile-Ansicht funktioniert einwandfrei
- Alle Datenbank-Abfragen funktionieren korrekt

#### Betroffene Bereiche
- Wettkampf-Seite (Competition.tsx)
- Alle Wettkampf-Komponenten (ResultInput, Leaderboard, etc.)
- Wettkampf-Hooks (useCompetitionBoulders, useCompetitionParticipant, etc.)
- Admin-Panel Integration
- Datenbank-Tabellen (bereits vorhanden)

#### Risiken & Herausforderungen
- Keine bekannten Risiken - Code ist vollständig vorhanden
- Eventuell müssen UI-Anpassungen für aktuelle Design-Standards gemacht werden
- Mobile-Ansicht sollte nochmal getestet werden

---

## 🎯 Geplante Features (Kurzfristig - Q1 2026)

### 1. QR-Code-Scanner für Sektoren
**Status:** ⏳ Teilweise implementiert (QR-Code-Generierung vorhanden)  
**Priorität:** Hoch  
**Aufwand:** Mittel (8-12 Stunden)  
**Geschätzte Zeit:** 2 Tage

#### Problembeschreibung
Aktuell können QR-Codes für Sektoren generiert werden (z.B. im Admin-Bereich), aber es gibt keine Möglichkeit für Nutzer, diese QR-Codes zu scannen und direkt zum entsprechenden Sektor zu navigieren. Dies wäre besonders nützlich für physische Schilder in der Kletterhalle.

#### Use Case
Ein Kletterer steht vor einem Sektor in der Halle und sieht ein QR-Code-Schild. Er öffnet die App, scannt den QR-Code und wird direkt zur Boulder-Übersicht dieses Sektors weitergeleitet, ohne manuell suchen zu müssen.

#### Was muss gemacht werden

**Technische Voraussetzungen:**
- QR-Code-Scanner-Library installieren (z.B. ZXing)
- Capacitor Camera Plugin für native Kamera-Zugriff installieren
- Kamera-Berechtigungen für iOS und Android konfigurieren
- Capacitor-Konfiguration aktualisieren

**Funktionalität:**
- QR-Code-Scanner-Komponente erstellen
- Kamera-Zugriff auf iOS und Android implementieren
- QR-Code-Parsing und Validierung
- Navigation zum entsprechenden Sektor nach erfolgreichem Scan
- Fehlerbehandlung für ungültige QR-Codes
- Fallback für Web-Browser (File-Upload für QR-Code-Bild)

**UI/UX:**
- Scanner-Dialog mit Kamera-Vorschau
- Visuelles Feedback während des Scannens
- Erfolgs- und Fehlermeldungen
- Integration in Sidebar/Navigation
- Mobile-optimierte Ansicht

**QR-Code-Format:**
- Standardisiertes Format definieren (z.B. "sector:{sector_id}")
- QR-Code-Generierung entsprechend anpassen
- Parsing-Logik implementieren

#### User Stories

**Als Kletterer möchte ich:**
- QR-Codes an Sektoren scannen können
- Direkt zur Boulder-Übersicht des Sektors navigiert werden
- Den Scanner einfach über die Navigation öffnen können
- Klare Rückmeldung erhalten, ob der Scan erfolgreich war

**Als Admin möchte ich:**
- QR-Codes für Sektoren generieren können (bereits vorhanden)
- Die generierten QR-Codes ausdrucken und in der Halle aufhängen können

#### Akzeptanzkriterien
- Scanner öffnet Kamera auf iOS und Android
- QR-Code wird korrekt erkannt und geparst
- Navigation zum Sektor funktioniert
- Fehlerbehandlung bei ungültigen QR-Codes
- Berechtigungen werden korrekt angefragt
- Web-Fallback funktioniert (File-Upload)
- UI ist intuitiv und benutzerfreundlich

#### Betroffene Bereiche
- Neue QR-Code-Scanner-Komponente
- Sidebar/Navigation (Integration)
- QR-Code-Utilities (Erweiterung)
- Capacitor-Konfiguration
- Android/iOS Berechtigungen

#### Risiken & Herausforderungen
- Kamera-Berechtigungen müssen korrekt gehandhabt werden
- Unterschiedliche Kamera-APIs zwischen Web und Native
- Performance bei kontinuierlichem Scannen
- QR-Code-Format muss standardisiert werden

---

### 2. Verbesserte Offline-Funktionalität
**Status:** ⏳ Service Worker vorhanden, aber nicht optimal  
**Priorität:** Mittel  
**Aufwand:** Hoch (12-16 Stunden)  
**Geschätzte Zeit:** 2-3 Tage

#### Problembeschreibung
Die App hat bereits einen Service Worker, aber die Offline-Funktionalität ist nicht optimal. Nutzer können nicht alle wichtigen Daten offline ansehen, und es gibt kein System für Offline-Uploads, die später synchronisiert werden.

#### Use Cases

**Use Case 1: Offline Boulder-Übersicht**
Ein Kletterer ist in der Halle ohne Internetverbindung. Er möchte trotzdem die Boulder-Übersicht ansehen und Beta-Videos schauen, die er bereits einmal geladen hat.

**Use Case 2: Offline Upload**
Ein Setter möchte einen neuen Boulder erstellen, hat aber keine Internetverbindung. Er soll alle Daten eingeben können und das System soll diese später automatisch hochladen, sobald eine Verbindung besteht.

#### Was muss gemacht werden

**Service Worker Optimierung:**
- Strategisches Caching für Boulders, Sektoren und Farben implementieren
- Cache-Strategien definieren (Cache-First für statische Daten, Network-First für dynamische Daten)
- Cache-Versionierung für Updates
- Cache-Bereinigung für alte Daten

**Offline-First-Ansatz:**
- Boulder-Übersicht aus Cache laden, wenn offline
- Beta-Videos cachen, die bereits einmal angesehen wurden
- Thumbnails cachen für schnelle Anzeige
- Daten-Synchronisation bei Wiederherstellung der Verbindung

**Offline-Upload-Queue:**
- System für Offline-Uploads implementieren
- Queue für Uploads, die offline erstellt wurden
- Automatische Synchronisation bei Verbindung
- Retry-Mechanismus für fehlgeschlagene Uploads
- Status-Anzeige für ausstehende Uploads

**UI-Anpassungen:**
- Offline-Indikator in der App anzeigen
- Hinweis, wenn Daten aus Cache geladen werden
- Status-Anzeige für ausstehende Uploads
- Möglichkeit, Uploads manuell zu synchronisieren

**Daten-Synchronisation:**
- Konflikt-Resolution für gleichzeitige Änderungen
- Last-Write-Wins oder Merge-Strategie definieren
- Benachrichtigung bei Synchronisations-Konflikten

#### User Stories

**Als Kletterer möchte ich:**
- Die Boulder-Übersicht auch offline ansehen können
- Beta-Videos offline schauen können, die ich bereits einmal geladen habe
- Sehen können, wenn ich offline bin
- Verstehen, welche Daten aktuell sind

**Als Setter möchte ich:**
- Boulders auch offline erstellen können
- Meine Uploads automatisch synchronisiert bekommen, sobald ich wieder online bin
- Den Status meiner ausstehenden Uploads sehen können
- Manuell synchronisieren können, wenn nötig

#### Akzeptanzkriterien
- Boulder-Übersicht funktioniert offline
- Bereits geladene Videos sind offline verfügbar
- Offline-Uploads werden automatisch synchronisiert
- Offline-Indikator wird angezeigt
- Cache wird intelligent verwaltet
- Keine Datenverluste bei Offline-Uploads

#### Betroffene Bereiche
- Service Worker (Optimierung)
- Cache-Management
- Upload-System (Offline-Queue)
- UI-Komponenten (Offline-Indikator)
- Daten-Synchronisation

#### Risiken & Herausforderungen
- Cache-Größe kann bei vielen Videos groß werden
- Konflikt-Resolution bei gleichzeitigen Änderungen
- Performance bei großen Cache-Mengen
- Benutzer müssen verstehen, welche Daten aktuell sind

---

### 3. Native Kamera-Zugriff
**Status:** ⏳ Geplant, nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Mittel (8-12 Stunden)  
**Geschätzte Zeit:** 2 Tage

#### Problembeschreibung
Aktuell können Setter nur Dateien von ihrem Gerät hochladen. Es wäre viel praktischer, wenn sie direkt in der App Fotos und Videos aufnehmen könnten, ohne die Dateien erst exportieren zu müssen.

#### Use Cases

**Use Case 1: Thumbnail-Aufnahme**
Ein Setter hat gerade einen neuen Boulder gesetzt und möchte ein Thumbnail-Foto direkt in der App aufnehmen, ohne die Kamera-App zu verlassen.

**Use Case 2: Beta-Video-Aufnahme**
Ein Setter möchte ein Beta-Video direkt in der App aufnehmen, während er den Boulder klettert.

#### Was muss gemacht werden

**Technische Voraussetzungen:**
- Capacitor Camera Plugin installieren
- Kamera-Berechtigungen für iOS und Android konfigurieren
- Capacitor-Konfiguration aktualisieren

**Funktionalität:**
- Kamera-Komponente für Foto-Aufnahme erstellen
- Kamera-Komponente für Video-Aufnahme erstellen
- Integration in Setter-Bereich für Thumbnail-Upload
- Integration in Setter-Bereich für Beta-Video-Upload
- Bild-/Video-Vorschau nach Aufnahme
- Möglichkeit, Aufnahme zu wiederholen
- Direkter Upload nach Aufnahme

**UI/UX:**
- Intuitive Kamera-Bedienung
- Foto/Video-Umschaltung
- Vorschau mit Option zum Wiederholen
- Progress-Anzeige beim Upload
- Mobile-optimierte Ansicht

**Berechtigungen:**
- Kamera-Berechtigung anfragen
- Erklärung, warum Berechtigung benötigt wird
- Fallback, wenn Berechtigung verweigert wird

#### User Stories

**Als Setter möchte ich:**
- Fotos direkt in der App aufnehmen können
- Videos direkt in der App aufnehmen können
- Meine Aufnahmen vor dem Upload sehen können
- Aufnahmen wiederholen können, wenn sie nicht gut sind
- Einfach zwischen Foto- und Video-Modus wechseln können

#### Akzeptanzkriterien
- Kamera öffnet sich auf iOS und Android
- Fotos können aufgenommen werden
- Videos können aufgenommen werden
- Vorschau funktioniert korrekt
- Upload funktioniert direkt nach Aufnahme
- Berechtigungen werden korrekt gehandhabt
- UI ist intuitiv und benutzerfreundlich

#### Betroffene Bereiche
- Neue Kamera-Komponenten
- Setter-Bereich (Integration)
- Upload-System (Erweiterung)
- Capacitor-Konfiguration
- Android/iOS Berechtigungen

#### Risiken & Herausforderungen
- Kamera-Berechtigungen müssen korrekt gehandhabt werden
- Unterschiedliche Kamera-APIs zwischen Web und Native
- Video-Qualität und Dateigröße
- Performance bei Video-Aufnahme

---

## 🎨 Geplante Features (Mittelfristig - Q2-Q3 2026)

### 1. Social Features
**Status:** ⏳ Nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Hoch (20-30 Stunden)  
**Geschätzte Zeit:** 1 Woche

#### Vision
Die App soll sozialer werden, damit Kletterer untereinander interagieren können. Dies erhöht die Bindung zur App und macht sie wertvoller für die Community.

#### Feature A: Favoriten-System

**Beschreibung:**
Nutzer können Boulders als Favoriten markieren, um sie später schnell wiederzufinden. Favoriten werden im Profil angezeigt und können als Filter verwendet werden.

**Funktionalität:**
- Boulders als Favoriten markieren/entmarkieren
- Favoriten-Liste im Profil anzeigen
- Filter nach Favoriten in Boulder-Übersicht
- Favoriten-Icon in Boulder-Detail-Ansicht
- Anzahl der Favoriten pro Boulder anzeigen (optional)

**Datenbank:**
- Neue Tabelle `boulder_favorites` mit user_id und boulder_id
- Eindeutige Kombination pro User/Boulder
- Indizes für schnelle Abfragen
- Row Level Security: User können nur eigene Favoriten sehen/verwalten

**UI/UX:**
- Herz-Icon zum Markieren/Entmarkieren
- Visuelles Feedback beim Klicken
- Favoriten-Filter in Boulder-Übersicht
- Favoriten-Sektion im Profil
- Sortierung nach Datum oder Name

**User Stories:**

**Als Kletterer möchte ich:**
- Boulders als Favoriten markieren können, die ich später nochmal klettern möchte
- Meine Favoriten schnell in meinem Profil finden können
- Nach meinen Favoriten filtern können
- Sehen können, welche Boulders ich favorisiert habe

#### Feature B: Kommentare-System

**Beschreibung:**
Nutzer können Kommentare zu Boulders hinzufügen, um Tipps zu teilen, Fragen zu stellen oder Erfahrungen auszutauschen.

**Funktionalität:**
- Kommentare zu Boulders hinzufügen
- Kommentare anzeigen (chronologisch sortiert)
- Eigene Kommentare bearbeiten
- Eigene Kommentare löschen
- Admin kann alle Kommentare moderieren/löschen
- Bearbeitete Kommentare markieren

**Datenbank:**
- Neue Tabelle `boulder_comments` mit boulder_id, user_id, comment, timestamps
- Indizes für schnelle Abfragen nach Boulder
- Row Level Security: Alle können lesen, nur eigene können schreiben/bearbeiten
- Admin-Rechte für Moderation

**UI/UX:**
- Kommentar-Sektion in Boulder-Detail-Dialog
- Kommentar-Formular mit Textarea
- Kommentar-Liste mit Avatar, Name, Zeitstempel
- Bearbeiten/Löschen-Buttons für eigene Kommentare
- Admin-Moderation-Interface
- Zeichenlimit (z.B. 1000 Zeichen)

**User Stories:**

**Als Kletterer möchte ich:**
- Kommentare zu Boulders lesen können, um Tipps zu bekommen
- Eigene Kommentare hinzufügen können, um Erfahrungen zu teilen
- Meine Kommentare bearbeiten können, wenn ich einen Fehler gemacht habe
- Meine Kommentare löschen können

**Als Admin möchte ich:**
- Kommentare moderieren können
- Unangemessene Kommentare löschen können
- Kommentare für bestimmte Boulders deaktivieren können (optional)

#### Akzeptanzkriterien
- Favoriten können hinzugefügt/entfernt werden
- Favoriten werden im Profil angezeigt
- Filter nach Favoriten funktioniert
- Kommentare können hinzugefügt werden
- Kommentare werden korrekt angezeigt
- Eigene Kommentare können bearbeitet/gelöscht werden
- Admin-Moderation funktioniert
- Alle Datenbank-Abfragen sind performant

#### Betroffene Bereiche
- Neue Datenbank-Tabellen (boulder_favorites, boulder_comments)
- Neue Hooks (useBoulderFavorites, useBoulderComments)
- Neue UI-Komponenten (FavoriteButton, BoulderComments)
- Boulder-Detail-Dialog (Integration)
- Boulder-Übersicht (Favoriten-Filter)
- Profil-Seite (Favoriten-Liste)
- Admin-Panel (Kommentar-Moderation)

#### Risiken & Herausforderungen
- Spam-Kommentare müssen moderiert werden
- Performance bei vielen Kommentaren pro Boulder
- Datenschutz: Kommentare sollten nicht zu persönlich sein
- Moderation kann zeitaufwändig sein

---

### 2. Persönliche Statistiken
**Status:** ⏳ Nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Mittel (12-18 Stunden)  
**Geschätzte Zeit:** 2-3 Tage

#### Vision
Kletterer sollen ihre eigenen Erfolge tracken können und sehen, wie sie sich entwickeln. Dies motiviert und hilft bei der Zielsetzung.

#### Beschreibung
Nutzer können ihre eigenen Boulder-Erfolge eintragen und erhalten personalisierte Statistiken über ihre Leistung.

#### Funktionalität

**Erfolgs-Tracking:**
- Boulder als "geschafft" markieren
- Anzahl Versuche pro Boulder eintragen
- Datum des Erfolgs speichern
- Persönliche Bestzeit tracken (optional)
- Notizen zu eigenen Versuchen hinzufügen

**Statistik-Dashboard:**
- Gesamtanzahl geschaffter Boulders
- Erfolgsrate pro Schwierigkeitsgrad
- Meist gekletterte Sektoren
- Persönliche Entwicklung über Zeit (Chart)
- Durchschnittliche Versuche pro Boulder
- Schwierigkeitsverteilung der geschafften Boulders

**Visualisierungen:**
- Charts für Entwicklung über Zeit
- Charts für Schwierigkeitsverteilung
- Charts für Sektor-Verteilung
- Vergleich mit eigenen Zielen (optional)

**Datenbank:**
- Neue Tabelle `user_boulder_results` mit user_id, boulder_id, completed, attempts, completed_at
- Indizes für schnelle Abfragen
- Row Level Security: User können nur eigene Ergebnisse sehen/verwalten

**UI/UX:**
- "Geschafft"-Button in Boulder-Detail-Dialog
- Versuchsanzahl eingeben
- Statistik-Sektion im Profil
- Charts für Visualisierung
- Export-Funktion für eigene Daten (optional)

#### User Stories

**Als Kletterer möchte ich:**
- Meine Erfolge tracken können
- Sehen können, wie viele Boulders ich geschafft habe
- Meine Entwicklung über Zeit sehen können
- Verstehen, in welchen Schwierigkeitsgraden ich gut bin
- Meine Ziele setzen und verfolgen können

#### Akzeptanzkriterien
- Erfolge können eingetragen werden
- Statistiken werden korrekt berechnet
- Charts werden korrekt angezeigt
- Daten werden pro User gespeichert
- Performance ist gut auch bei vielen Einträgen

#### Betroffene Bereiche
- Neue Datenbank-Tabelle (user_boulder_results)
- Neue Hooks (useUserBoulderResults, usePersonalStatistics)
- Neue UI-Komponenten (Statistik-Dashboard, Erfolgs-Tracking)
- Boulder-Detail-Dialog (Erfolgs-Tracking)
- Profil-Seite (Statistik-Sektion)

#### Risiken & Herausforderungen
- Performance bei vielen Einträgen pro User
- Datenschutz: Persönliche Daten müssen geschützt werden
- Motivation: Statistiken sollten motivierend sein, nicht demotivierend

---

### 3. Boulder-Routenplanung
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Hoch (20-30 Stunden)  
**Geschätzte Zeit:** 1 Woche

#### Vision
Kletterer sollen eine optimale Route durch die Halle berechnen können, um effizient zu trainieren und alle interessanten Boulders zu erreichen.

#### Beschreibung
Die App berechnet eine optimale Route durch die Halle basierend auf Sektor-Positionen, Schwierigkeit und persönlichen Präferenzen.

#### Funktionalität

**Routenberechnung:**
- Optimale Route durch Halle berechnen
- Berücksichtigung von Sektor-Positionen
- Berücksichtigung von Schwierigkeit
- Berücksichtigung von persönlichen Präferenzen (z.B. nur bestimmte Schwierigkeiten)
- Mehrere Routen-Optionen vorschlagen

**Routen-Verwaltung:**
- Routen speichern
- Routen benennen
- Routen teilen (optional)
- Routen bearbeiten
- Routen löschen

**UI/UX:**
- Routenplanungs-Interface
- Visualisierung der Route auf Karte/Plan
- Schritt-für-Schritt-Anleitung
- Geschätzte Zeit pro Route
- Schwierigkeits-Übersicht pro Route

**Datenbank:**
- Neue Tabelle `routes` mit user_id, name, boulder_ids, created_at
- Neue Tabelle `route_boulders` für viele-zu-viele Beziehung
- Sektor-Positionen müssen in Datenbank gespeichert werden

#### User Stories

**Als Kletterer möchte ich:**
- Eine optimale Route durch die Halle berechnen lassen können
- Routen speichern können, die ich regelmäßig klettere
- Routen teilen können mit anderen Kletterern
- Meine Routen verwalten können

#### Akzeptanzkriterien
- Routen werden korrekt berechnet
- Routen können gespeichert werden
- Routen können geteilt werden (falls implementiert)
- UI ist intuitiv und benutzerfreundlich

#### Betroffene Bereiche
- Neue Datenbank-Tabellen (routes, route_boulders)
- Routenplanungs-Algorithmus
- Neue UI-Komponenten (RoutePlanner, RouteList)
- Sektor-Verwaltung (Positionen hinzufügen)

#### Risiken & Herausforderungen
- Routenplanungs-Algorithmus ist komplex
- Sektor-Positionen müssen erfasst werden
- Performance bei komplexen Berechnungen
- UI für Routenplanung muss intuitiv sein

---

### 4. Erweiterte Filter
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Niedrig  
**Aufwand:** Niedrig (4-8 Stunden)  
**Geschätzte Zeit:** 1 Tag

#### Beschreibung
Erweiterte Filter-Optionen für die Boulder-Übersicht, um noch präziser suchen zu können.

#### Zusätzliche Filter

**Nach Datum:**
- Filter nach Erstellungsdatum
- Filter nach letztem Update
- Filter nach Zeitraum (z.B. letzte Woche, letzter Monat)

**Nach Setter:**
- Filter nach dem Setter, der den Boulder erstellt hat
- Anzeige des Setter-Namens im Boulder-Detail

**Nach Status-Historie:**
- Filter nach Bouldern, die kürzlich abgeschraubt wurden
- Filter nach Bouldern, die kürzlich aufgehängt wurden

**Kombinierte Filter:**
- Filter-Kombinationen speichern
- Schnellzugriff auf gespeicherte Filter
- Filter-Vorschläge basierend auf Nutzung

#### User Stories

**Als Kletterer möchte ich:**
- Nach neuen Bouldern filtern können
- Nach Bouldern eines bestimmten Setters filtern können
- Meine bevorzugten Filter-Kombinationen speichern können
- Schnell auf gespeicherte Filter zugreifen können

#### Akzeptanzkriterien
- Alle neuen Filter funktionieren korrekt
- Filter-Kombinationen können gespeichert werden
- Performance ist gut auch bei vielen Filtern
- UI ist intuitiv

#### Betroffene Bereiche
- Boulder-Übersicht (Filter erweitern)
- Datenbank-Abfragen (neue Filter-Parameter)
- UI-Komponenten (Filter-UI erweitern)

---

### 5. Dark Mode
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Mittel (12-16 Stunden)  
**Geschätzte Zeit:** 2-3 Tage

#### Vision
Die App soll einen Dark Mode unterstützen, um die Nutzerfreundlichkeit zu verbessern, besonders bei Nutzung in dunklen Umgebungen oder abends.

#### Beschreibung
Vollständiger Dark Mode für die gesamte App mit automatischer Erkennung der System-Präferenz.

#### Funktionalität

**Theme-Management:**
- Dark Mode aktivieren/deaktivieren
- System-Präferenz automatisch erkennen
- Theme-Präferenz pro User speichern (optional)
- Smooth Transitions zwischen Themes

**Design-Anpassungen:**
- Alle Komponenten für Dark Mode anpassen
- Farben für Dark Mode definieren
- Kontraste prüfen und anpassen
- Bilder/Logos für Dark Mode anpassen
- Charts für Dark Mode anpassen

**UI/UX:**
- Theme-Toggle in Navigation/Sidebar
- Visuelles Feedback beim Umschalten
- Persistente Einstellung
- System-Präferenz als Standard

#### User Stories

**Als Nutzer möchte ich:**
- Dark Mode aktivieren können, wenn ich es bevorzuge
- Die App automatisch im Dark Mode sehen, wenn mein System so eingestellt ist
- Smooth zwischen Light und Dark Mode wechseln können
- Meine Präferenz gespeichert haben

#### Akzeptanzkriterien
- Dark Mode funktioniert für alle Komponenten
- System-Präferenz wird erkannt
- Theme-Präferenz wird gespeichert (falls implementiert)
- Alle Texte sind gut lesbar
- Keine kontrastlosen Elemente
- Smooth Transitions

#### Betroffene Bereiche
- Alle Komponenten (Dark Mode Klassen)
- Globale Styles (CSS-Variablen)
- Theme-Provider
- Theme-Toggle-Komponente
- Charts (Farben anpassen)

#### Risiken & Herausforderungen
- Viele Komponenten müssen angepasst werden
- Konsistenz über alle Komponenten hinweg
- Bilder müssen für Dark Mode angepasst werden
- Charts müssen Dark-Mode-Farben haben

---

## 🚀 Geplante Features (Langfristig - Q4 2026+)

### 1. White-Label-Lösung
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Hoch (80-120 Stunden)  
**Geschätzte Zeit:** 3-4 Wochen

#### Vision
Die App soll als White-Label-Lösung für andere Kletterhallen angeboten werden können, sodass jede Halle ihre eigene Branded-Version der App hat.

#### Beschreibung
Multi-Tenant-System, bei dem jede Kletterhalle ihre eigene Instanz der App mit eigenem Branding hat.

#### Funktionalität

**Multi-Tenant-Support:**
- Tenant-Verwaltung
- Tenant-Isolation in Datenbank
- Tenant-spezifische Domain-Support
- Tenant-spezifische Konfiguration

**Branding:**
- Logo pro Tenant
- Farben pro Tenant
- App-Name pro Tenant
- Custom Domain pro Tenant

**Verwaltung:**
- Admin-Interface für Tenant-Verwaltung
- Tenant-Erstellung
- Tenant-Konfiguration
- Tenant-Statistiken

#### User Stories

**Als Kletterhallen-Betreiber möchte ich:**
- Meine eigene Version der App haben können
- Mein eigenes Branding verwenden können
- Meine eigene Domain verwenden können
- Meine eigenen Daten isoliert haben

#### Akzeptanzkriterien
- Multi-Tenant-System funktioniert
- Branding kann pro Tenant angepasst werden
- Daten sind pro Tenant isoliert
- Performance ist gut auch bei vielen Tenants

#### Betroffene Bereiche
- Gesamte Architektur (Multi-Tenant)
- Datenbank (Tenant-ID in allen Tabellen)
- Row Level Security (Tenant-Isolation)
- Frontend (dynamisches Branding)
- Admin-Panel (Tenant-Verwaltung)

#### Risiken & Herausforderungen
- Sehr große Architektur-Änderung
- Performance bei vielen Tenants
- Daten-Isolation muss sicher sein
- Komplexe Konfiguration

---

### 2. Multi-Tenant-Support
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Hoch (60-100 Stunden)  
**Geschätzte Zeit:** 2-3 Wochen

#### Beschreibung
Technische Basis für Multi-Tenant-System (siehe White-Label-Lösung).

---

### 3. API für externe Integrationen
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Hoch (40-60 Stunden)  
**Geschätzte Zeit:** 1-2 Wochen

#### Vision
Externe Systeme sollen auf die App-Daten zugreifen können, um Integrationen zu ermöglichen.

#### Beschreibung
RESTful API mit Authentifizierung für externe Zugriffe.

#### Funktionalität

**API-Endpoints:**
- Boulder-Daten abrufen
- Sektor-Daten abrufen
- Statistiken abrufen
- Webhooks für Events

**Authentifizierung:**
- API-Keys für externe Zugriffe
- Rate Limiting
- Dokumentation (Swagger/OpenAPI)

#### User Stories

**Als Entwickler möchte ich:**
- Auf App-Daten über API zugreifen können
- Webhooks für Events erhalten können
- API-Dokumentation einsehen können

#### Akzeptanzkriterien
- API funktioniert korrekt
- Authentifizierung ist sicher
- Rate Limiting funktioniert
- Dokumentation ist vollständig

---

### 4. Erweiterte Analytics
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Mittel (20-30 Stunden)  
**Geschätzte Zeit:** 3-5 Tage

#### Beschreibung
Umfassende Analytics für Admins, um die App-Nutzung zu verstehen.

#### Funktionalität

**Nutzungsstatistiken:**
- Aktive Nutzer
- Seitenaufrufe
- Feature-Nutzung
- Geräte-Statistiken

**Boulder-Analytics:**
- Beliebtheit von Bouldern
- Meist angesehene Videos
- Meist gefilterte Sektoren

**User-Engagement:**
- Durchschnittliche Session-Dauer
- Rückkehrrate
- Feature-Adoption

**Visualisierungen:**
- Charts für alle Metriken
- Zeitreihen-Analysen
- Export-Funktionen

#### User Stories

**Als Admin möchte ich:**
- Verstehen, wie die App genutzt wird
- Sehen, welche Features beliebt sind
- Verstehen, wie sich die Nutzung entwickelt
- Daten exportieren können

#### Akzeptanzkriterien
- Analytics werden korrekt erfasst
- Visualisierungen sind aussagekräftig
- Export funktioniert
- Performance ist gut

---

### 5. KI-gestützte Boulder-Empfehlungen
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Hoch (60-100 Stunden)  
**Geschätzte Zeit:** 2-3 Wochen

#### Vision
Die App soll personalisierte Boulder-Empfehlungen basierend auf bisherigen Erfolgen und Präferenzen geben.

#### Beschreibung
Machine Learning-basierter Empfehlungs-Algorithmus für Boulders.

#### Funktionalität

**Empfehlungs-Algorithmus:**
- Basierend auf geschafften Bouldern
- Basierend auf Schwierigkeit
- Basierend auf Sektor-Präferenzen
- Basierend auf ähnlichen Usern (Collaborative Filtering)

**UI/UX:**
- Empfehlungs-Sektion im Dashboard
- "Für dich empfohlen"-Bereich
- Erklärung, warum empfohlen wird
- Feedback-System für Empfehlungen

#### User Stories

**Als Kletterer möchte ich:**
- Personalisierte Boulder-Empfehlungen erhalten
- Verstehen, warum mir bestimmte Boulders empfohlen werden
- Feedback zu Empfehlungen geben können

#### Akzeptanzkriterien
- Empfehlungen sind relevant
- Algorithmus lernt aus Feedback
- Performance ist gut
- UI ist intuitiv

#### Risiken & Herausforderungen
- Machine Learning ist komplex
- Daten müssen für Training gesammelt werden
- Algorithmus muss getestet werden
- Performance bei vielen Usern

---

## ⚡ Technische Verbesserungen

### Performance-Optimierungen

#### 1. Lazy Loading für alle Routen
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Mittel  
**Aufwand:** Niedrig (2-4 Stunden)

#### Beschreibung
Alle Seiten-Komponenten sollen lazy geladen werden, um die initiale Bundle-Größe zu reduzieren.

#### Was muss gemacht werden
- Alle Route-Komponenten lazy laden
- Suspense-Boundaries für Loading-States hinzufügen
- Code-Splitting optimieren
- Preloading für wahrscheinliche Routen (optional)

#### Erwartete Verbesserungen
- Initiale Bundle-Größe: ~30-40% kleiner
- Time to Interactive: ~20-30% schneller
- First Contentful Paint: ~15-25% schneller

---

#### 2. Virtualisierung für lange Listen
**Status:** ⏳ Nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Mittel (8-12 Stunden)

#### Beschreibung
Bei vielen Bouldern (>100) kann die Rendering-Performance leiden. Virtualisierung rendert nur sichtbare Items.

#### Was muss gemacht werden
- React Virtual oder ähnliche Library integrieren
- Boulder-Liste virtualisieren
- Sektor-Liste virtualisieren
- Leaderboard virtualisieren (bei vielen Teilnehmern)
- Dynamische Höhen-Schätzung (optional)

#### Erwartete Verbesserungen
- Rendering-Zeit: ~80-90% schneller bei >100 Items
- Memory-Usage: ~70-80% weniger bei großen Listen
- Scroll-Performance: Smooth auch bei 1000+ Items

---

#### 3. Debouncing für Suche
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Niedrig (1-2 Stunden)

#### Beschreibung
Die Boulder-Suche führt bei jedem Tastendruck eine Filterung durch. Debouncing verzögert die Suche um 300-500ms.

#### Was muss gemacht werden
- Debounce-Hook erstellen
- Suche debouncen
- Loading-Indicator während Debounce
- Optional: useMemo für teure Berechnungen

#### Erwartete Verbesserungen
- Weniger unnötige Berechnungen
- Bessere Performance bei vielen Bouldern
- Responsivere UI

---

#### 4. Optimistic Updates
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Mittel  
**Aufwand:** Mittel (4-6 Stunden)

#### Beschreibung
UI wird sofort aktualisiert, bevor Server-Antwort kommt. Bei Fehler wird Rollback durchgeführt.

#### Was muss gemacht werden
- Optimistic Updates für Boulder-Erstellung
- Optimistic Updates für Status-Änderungen
- Rollback-Mechanismus bei Fehlern
- Bessere UX bei langsamen Verbindungen

#### Erwartete Verbesserungen
- App fühlt sich schneller an
- Bessere UX bei langsamen Verbindungen
- Weniger Wartezeit für Nutzer

---

#### 5. Bundle-Size-Optimierung
**Status:** ⏳ Nicht optimiert  
**Priorität:** Niedrig  
**Aufwand:** Mittel (4-8 Stunden)

#### Beschreibung
Bundle-Größe analysieren und optimieren, um Ladezeiten zu reduzieren.

#### Was muss gemacht werden
- Bundle-Analyse durchführen
- Unused Dependencies entfernen
- Tree-Shaking optimieren
- Code-Splitting verbessern
- Asset-Optimierung (Bilder, Videos)

#### Erwartete Verbesserungen
- Kleinere Bundle-Größe
- Schnellere Ladezeiten
- Bessere Performance

---

## 🔧 Code-Qualität & Refactoring

### 1. Error Boundaries implementieren
**Status:** ⏳ Teilweise vorhanden  
**Priorität:** Hoch  
**Aufwand:** Niedrig (2-4 Stunden)

#### Beschreibung
Error Boundaries fangen Fehler ab und zeigen eine Fehlerseite statt die App zum Absturz zu bringen.

#### Was muss gemacht werden
- Error Boundary für gesamte App
- Error Boundaries für kritische Bereiche
- Fehler-Logging (z.B. Sentry)
- User-freundliche Fehlermeldungen

#### Erwartete Verbesserungen
- App stürzt nicht mehr ab
- Bessere Fehlerbehandlung
- Fehler können nachverfolgt werden

---

### 2. Unit-Tests für kritische Funktionen
**Status:** ⏳ Nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Hoch (20-40 Stunden)

#### Beschreibung
Tests für kritische Funktionen schreiben, um Bugs früh zu finden.

#### Was muss gemacht werden
- Test-Framework einrichten (z.B. Vitest)
- Tests für Hooks schreiben
- Tests für Utility-Funktionen
- Tests für Daten-Transformationen
- CI/CD Integration

#### Kritische Funktionen zum Testen
- Authentifizierung
- Boulder-Daten-Laden
- Upload-Funktionen
- Daten-Transformationen

---

### 3. E2E-Tests für Haupt-Workflows
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Hoch (20-40 Stunden)

#### Beschreibung
End-to-End-Tests für die wichtigsten User-Flows.

#### Was muss gemacht werden
- E2E-Test-Framework einrichten (z.B. Playwright)
- Tests für User-Registrierung/Login
- Tests für Boulder-Erstellung (Setter)
- Tests für Boulder-Filterung
- Tests für Admin-Funktionen

---

### 4. Code-Splitting optimieren
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Niedrig  
**Aufwand:** Mittel (4-6 Stunden)

#### Beschreibung
Code-Splitting weiter optimieren für bessere Performance.

#### Was muss gemacht werden
- Route-basiertes Code-Splitting
- Component-basiertes Code-Splitting
- Vendor-Chunks optimieren
- Dynamic Imports für große Bibliotheken

---

### 5. Refactoring von großen Komponenten
**Status:** ⏳ Bekanntes Problem  
**Priorität:** Mittel  
**Aufwand:** Mittel (8-12 Stunden)

#### Problem
Setter.tsx ist sehr groß (~1800 Zeilen) und schwer wartbar.

#### Was muss gemacht werden
- Aufteilen in kleinere Komponenten:
  - BoulderForm (Formular für Boulder-Erstellung)
  - BoulderEditForm (Formular für Boulder-Bearbeitung)
  - BoulderList (Liste der Boulders)
  - UploadQueue (Upload-Queue-Verwaltung)
- Custom Hooks extrahieren
- Logik von UI trennen

#### Erwartete Verbesserungen
- Bessere Wartbarkeit
- Einfacher zu testen
- Wiederverwendbare Komponenten

---

## 🎨 UX-Verbesserungen

### 1. Onboarding-Flow für neue User
**Status:** ⏳ Teilweise vorhanden  
**Priorität:** Mittel  
**Aufwand:** Mittel (4-6 Stunden)

#### Beschreibung
Neue User sollen eine Schritt-für-Schritt-Einführung in die App erhalten.

#### Was muss gemacht werden
- Onboarding-Komponente erweitern
- Schritt-für-Schritt-Anleitung:
  - App-Funktionen erklären
  - Boulder-Suche zeigen
  - Filter erklären
  - Profil-Einstellungen zeigen
- Skip-Option
- Persistente Einstellung (nicht erneut zeigen)

#### Erwartete Verbesserungen
- Neue User verstehen die App schneller
- Höhere Feature-Adoption
- Bessere User-Erfahrung

---

### 2. Verbesserte Fehlerbehandlung
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Hoch  
**Aufwand:** Mittel (4-6 Stunden)

#### Beschreibung
Konsistente, benutzerfreundliche Fehlermeldungen überall in der App.

#### Was muss gemacht werden
- Konsistente Fehlermeldungen
- User-freundliche Fehlermeldungen (keine technischen Details)
- Retry-Mechanismen bei Fehlern
- Fehler-Logging für Debugging
- Toast-Notifications für Fehler

#### Erwartete Verbesserungen
- Nutzer verstehen Fehler besser
- Weniger Frustration
- Bessere Debugging-Möglichkeiten

---

### 3. Loading-States optimieren
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Mittel  
**Aufwand:** Niedrig (2-4 Stunden)

#### Beschreibung
Konsistente, ansprechende Loading-States überall in der App.

#### Was muss gemacht werden
- Konsistente Loading-States
- Skeleton-Screens statt Spinner
- Progressive Loading für Listen
- Optimistische Updates wo möglich

#### Erwartete Verbesserungen
- App fühlt sich schneller an
- Bessere User-Erfahrung
- Weniger Wartezeit-Wahrnehmung

---

### 4. Accessibility-Verbesserungen (WCAG 2.1)
**Status:** ⏳ Nicht vollständig  
**Priorität:** Niedrig  
**Aufwand:** Mittel (8-12 Stunden)

#### Beschreibung
App für alle Nutzer zugänglich machen, inklusive Screen-Reader-Nutzer.

#### Was muss gemacht werden
- ARIA-Labels für alle interaktiven Elemente
- Keyboard-Navigation verbessern
- Screen-Reader-Unterstützung
- Kontrast-Verhältnisse prüfen
- Focus-Management verbessern

#### Erwartete Verbesserungen
- App ist für alle zugänglich
- Bessere Barrierefreiheit
- Compliance mit WCAG 2.1

---

## ⚠️ Bekannte Probleme & Limitationen

### 1. Wettkampf-Modus deaktiviert
**Status:** 🔴 Code vorhanden, aber UI ausgeblendet  
**Lösung:** Siehe [Kritische Aufgaben](#1-wettkampf-modus-reaktivieren)

---

### 2. Setter.tsx zu groß
**Status:** 🟡 ~1800 Zeilen, schwer wartbar  
**Lösung:** Siehe [Refactoring](#5-refactoring-von-großen-komponenten)

---

### 3. Nicht alle Routen lazy geladen
**Status:** 🟡 Performance könnte verbessert werden  
**Lösung:** Siehe [Lazy Loading](#1-lazy-loading-für-alle-routen)

---

### 4. Service Worker könnte optimiert werden
**Status:** 🟡 Offline-Funktionalität nicht optimal  
**Lösung:** Siehe [Verbesserte Offline-Funktionalität](#2-verbesserte-offline-funktionalität)

---

### 5. Upload-Logging Statistiken fehlen
**Status:** 🟡 Upload-Logging implementiert, aber Statistiken fehlen  
**Lösung:** Optional - kann später hinzugefügt werden

---

## 📊 Priorisierung nach Dringlichkeit

### 🔴 Sofort (Diese Woche)
1. Wettkampf-Modus reaktivieren
2. Error Boundaries vollständig implementieren
3. Verbesserte Fehlerbehandlung

### 🟠 Kurzfristig (Dieser Monat)
1. QR-Code-Scanner für Sektoren
2. Native Kamera-Zugriff
3. Lazy Loading für alle Routen
4. Onboarding-Flow verbessern

### 🟡 Mittelfristig (Nächste 3 Monate)
1. Verbesserte Offline-Funktionalität
2. Social Features (Favoriten, Kommentare)
3. Persönliche Statistiken
4. Virtualisierung für lange Listen
5. Dark Mode

### 🟢 Langfristig (6+ Monate)
1. Boulder-Routenplanung
2. Erweiterte Filter
3. White-Label-Lösung
4. Multi-Tenant-Support
5. API für externe Integrationen
6. Erweiterte Analytics
7. KI-gestützte Boulder-Empfehlungen

---

## 📝 Zusammenfassung

### Bereits implementiert ✅
- Push-Notifications
- Feedback-System
- Upload-Logging-System
- QR-Code-Generierung
- Admin-Panel
- Setter-Bereich
- Wettkampf-System (Code vorhanden, aber deaktiviert)

### Nächste Schritte (Priorität)
1. **Wettkampf-Modus reaktivieren** (kritisch, schnell)
2. **Lazy Loading** (Quick Win, große Auswirkung)
3. **QR-Code-Scanner** (neues Feature, hohe Priorität)
4. **Debouncing** (Quick Win, Performance)
5. **Error Boundaries** (Stabilität)

### Langfristige Vision
- White-Label-Lösung für andere Kletterhallen
- Multi-Tenant-Support
- Erweiterte Analytics
- KI-gestützte Empfehlungen

---

**Letzte Aktualisierung:** Februar 2026  
**Nächste Review:** März 2026  
**Gesamt Features geplant:** ~30+  
**Geschätzter Gesamtaufwand:** ~372-580 Stunden (~9-15 Monate bei Vollzeit)
