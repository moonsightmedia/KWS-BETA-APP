import type { LaunchIssue, LaunchIssueEvent } from './launchMonitoring';

export function monitoringPlatformName(platform: string | null): string {
  return ({ web: 'Webbrowser', android: 'Android', ios: 'iPhone / iPad', java: 'Android', cocoa: 'iPhone / iPad' } as Record<string, string>)[platform || ''] || 'Nicht eindeutig zugeordnet';
}

export function monitoringVersionName(release: string | null): string {
  return release?.match(/(?:^|[@\s])v?(\d+\.\d+\.\d+)(?:[+\s-]|$)/)?.[1] || 'Nicht angegeben';
}

export function monitoringIssueGuide(issue: LaunchIssue, events: LaunchIssueEvent[] = []) {
  const latest = events[0];
  const component = typeof latest?.props.component === 'string' ? latest.props.component : '';
  const code = typeof latest?.props.code === 'string' ? latest.props.code : '';
  const title = issue.title.toLocaleLowerCase('de');
  let heading = 'Problem in der App';
  let impact = 'Die App hat einen technischen Fehler gemeldet. Welche Funktion dadurch beeinträchtigt war, ist noch nicht eindeutig bekannt.';
  let check = 'Prüfe, ob du das Problem in der App nachvollziehen kannst.';
  if (component === 'query' || /^Query/.test(code) || title.includes('app-daten') || title.includes('boulderliste')) {
    heading = 'App-Daten wurden nicht geladen';
    impact = 'Eine Ansicht konnte ihre Daten nicht laden. Das ist nicht automatisch ein Absturz.';
    check = 'Öffne die Ansicht erneut und prüfe, ob die Inhalte wieder erscheinen.';
  } else if (component === 'mutation' || /^Mutation/.test(code) || title.includes('nicht gespeichert')) {
    heading = 'Änderung konnte nicht gespeichert werden';
    impact = 'Eine Speicheranfrage ist fehlgeschlagen. Ob die Änderung trotzdem angekommen ist, muss in der App geprüft werden.';
    check = 'Prüfe zuerst den gespeicherten Stand, bevor du die Änderung erneut ausführst.';
  } else if (component === 'video_player' || title.includes('video')) {
    heading = 'Video konnte nicht abgespielt werden';
    impact = 'Ein Video wurde nicht erfolgreich geladen oder abgespielt. Andere Bereiche der App können weiterhin funktionieren.';
    check = 'Öffne den betroffenen Boulder und teste das Video erneut, möglichst auch mit einer anderen Verbindung.';
  } else if (component === 'upload' || title.includes('upload')) {
    heading = 'Upload wurde unterbrochen';
    impact = 'Beim Hochladen ist ein Fehler aufgetreten. Ob bereits etwas veröffentlicht wurde, ist dadurch noch nicht geklärt.';
    check = 'Prüfe zuerst die Uploadübersicht und den Boulder. Lade nicht ungeprüft ein zweites Mal hoch.';
  } else if (component === 'authentication' || code === 'AuthenticationServiceError' || title.includes('anmeldedienst')) {
    heading = 'Anmeldung war nicht verfügbar';
    impact = 'Die App hat ein technisches Problem bei der Anmeldung gemeldet. Das ist kein Nachweis für ein falsches Passwort.';
    check = 'Prüfe, ob eine reguläre Anmeldung wieder möglich ist. Ändere dafür keine fremden Zugangsdaten.';
  } else if (component === 'app_start') {
    heading = 'App-Start wurde unterbrochen';
    impact = 'Beim Starten ist ein Fehler aufgetreten. Wie weit die App geladen wurde, geht aus dieser Meldung allein nicht hervor.';
    check = 'Öffne die App erneut und prüfe, ob die Startansicht erreichbar ist.';
  } else if (component === 'react_boundary') {
    heading = 'App-Ansicht ist ausgefallen';
    impact = 'Eine Ansicht konnte nicht weiter angezeigt werden. Ob weitere Ansichten betroffen sind, ist nicht bestätigt.';
    check = 'Öffne die Ansicht erneut und notiere, bei welchem Schritt der Fehler wieder auftritt.';
  }
  const reason = /^(Query|Mutation)Network$/.test(code)
    ? 'Verbindungsproblem gemeldet. Ob Gerät, Netzwerk oder Server die Ursache war, ist nicht bestätigt.'
    : /^(Query|Mutation)Timeout$/.test(code)
      ? 'Die Anfrage hat zu lange gedauert. Der Bericht belegt noch nicht, warum.'
      : /^(Query|Mutation)Server5\d{2}$/.test(code)
        ? 'Der Server hat einen Fehler zurückgemeldet. Die genaue Ursache muss technisch geprüft werden.'
        : 'Die genaue Ursache ist noch nicht bestätigt.';
  return { heading, impact, reason, steps: [check, 'Bei Wiederholung oder weiteren Geräten: Bericht an die Technik weitergeben.'] };
}

export function monitoringSupportReport(issue: LaunchIssue, events: LaunchIssueEvent[] = []): string {
  const guide = monitoringIssueGuide(issue, events);
  const latest = events[0];
  return [
    'Beta – technischer Fehlerbericht',
    `Problem: ${issue.title}`,
    `Auswirkung: ${guide.impact}`,
    `Einordnung: ${guide.reason}`,
    `Quelle: ${issue.source === 'sentry' ? 'Sentry (gesamter Problemverlauf)' : 'App-Diagnose (gewählter Zeitraum)'}`,
    `Plattform: ${monitoringPlatformName(issue.platform)}`,
    `Release: ${issue.release || 'Nicht angegeben'}`,
    `Meldungen: ${issue.occurrences}`,
    `${issue.source === 'sentry' ? 'Nutzerreferenzen in Sentry' : 'Erfasste Geräte'}: ${issue.affected_devices}`,
    `Erste Meldung: ${issue.first_seen_at}`,
    `Letzte Meldung: ${issue.last_seen_at}`,
    `Fehlergruppe: ${issue.fingerprint}`,
    ...(latest ? [`Letzter Einzelbericht: ${latest.event_id}`, `Fehlercode: ${typeof latest.props.code === 'string' ? latest.props.code : 'Nicht angegeben'}`] : []),
  ].join('\n');
}
