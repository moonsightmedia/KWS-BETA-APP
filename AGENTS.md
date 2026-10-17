# KWS Beta App – Repository-Anweisungen

Diese Regeln ergänzen die globalen Agentenanweisungen für dieses Repository.

## Verbindlicher Designstandard

Vor jeder materiellen Änderung an sichtbarer UI muss
[`docs/DESIGN.md`](docs/DESIGN.md) vollständig gelesen und angewendet werden.

- Wiederverwende zuerst die dort genannten gemeinsamen KWS-Komponenten und
  Tokens.
- Kopiere keine alten seitenlokalen Farben, Pill-Radien oder
  `rounded-xl/2xl/full`-Muster als neue Designgrundlage.
- Prüfe betroffene Oberflächen gerendert bei mindestens 375, 768, 1280 und
  1920 px und führe die zwei in `docs/DESIGN.md` beschriebenen visuellen
  QA-Loops durch.
- Wenn der Nutzer eine neue wiederverwendbare Design- oder Interaktionsregel
  bestätigt, aktualisiere `docs/DESIGN.md` im selben Arbeitsschritt.
- `docs/USER_AREA_DESIGN_GUIDE.md` ist historisch und nicht mehr verbindlich.

Bestehende globale Sicherheits-, Workflow-, Git- und Handoff-Regeln bleiben
unverändert gültig.

## Web-Veröffentlichung

App und Landingpage werden gemeinsam über `main` veröffentlicht. Änderungen an
`public/landing` durchlaufen denselben PR-/CI-Ablauf wie die App. Der gemeinsame
Build und Rollback sind in `docs/GITHUB_WEB_AUTODEPLOY.md` beschrieben. Der frühere
separate Landing-Upload ist nach der Umstellung kein regulärer Releaseweg mehr.
