/** Compare-and-swap publication. All effects are injected for regression tests. */
export async function publishThumbnailDecision(decision, {read,save,getSession,backend,publicKey,transportFor,upload,uuid}) {

  // Recover a media upload or successful PATCH whose response was lost.
  const durable = (await read()).find(d => d.key === decision.key);
  if (durable && durable.state !== 'draft' && durable.state !== 'skipped') decision = durable;
  const session = await getSession();
  if (!session) throw new Error('Bitte zuerst in dieser App als Setter anmelden.');
  if (decision.sourceBackend !== backend || !['accepted','published'].includes(decision.state)) throw new Error('Nur bestätigte Bilder dieses Backends können übernommen werden.');
  if (decision.ownerId && decision.ownerId !== session.user.id) throw new Error('Diese Übertragung gehört zu einem anderen Konto.');
  const transport = transportFor(session.user.id);
  const headers = {apikey:publicKey, 'Content-Type':'application/json', Prefer:'return=representation'};
  const endpoint = `${backend}/rest/v1/boulders`;
  let allowed = false;
  for (const role of ['setter','admin']) {
    const response = await transport(`${backend}/rest/v1/rpc/has_role`, {method:'POST',headers,
      body:JSON.stringify({_user_id:session.user.id,_role:role})});
    if (!response.ok) throw new Error('Setter-Freigabe konnte nicht geprüft werden.');
    if (await response.json() === true) { allowed = true; break; }
  }
  if (!allowed) throw new Error('Für die Online-Übernahme brauchst du eine Setter- oder Adminfreigabe.');
  const current = await transport(`${endpoint}?${new URLSearchParams({id:`eq.${decision.boulderId}`,select:'id,thumbnail_url,color,color_2,status'})}`, {headers});
  if (!current.ok) throw new Error('Aktueller Online-Stand konnte nicht geprüft werden.');
  const rows = await current.json();
  if (rows.length !== 1) throw new Error('Boulder nicht mehr verfügbar.');
  if (decision.publishedUrl && rows[0].thumbnail_url === decision.publishedUrl) {
    const recovered = {...decision,state:'published'}; await save(recovered); return recovered;
  }
  if (rows[0].thumbnail_url !== decision.sourceUrl) throw new Error('Das Online-Bild wurde inzwischen geändert. Bitte Bestand neu laden und erneut prüfen.');
  if (!decision.color || rows[0].color !== decision.color || (rows[0].color_2 || null) !== decision.color2 || rows[0].status !== 'haengt') throw new Error('Farbe oder Boulderstatus haben sich geändert. Bitte Bestand neu laden und erneut bestätigen.');
  if (!decision.focus?.result || decision.focus.mode !== 'focus' || !decision.focus.selected.length) throw new Error('Keine markierten Startgriffe. Bitte korrigieren oder Original behalten.');
  let pending = {...decision,ownerId:session.user.id,uploadId:decision.uploadId || uuid()};
  await save(pending);
  if (!pending.publishedUrl) {
    const uploaded = await upload(decision.focus,pending.uploadId,transport);
    if (!uploaded.url) throw new Error('Bildübertragung hat keine URL geliefert.');
    pending = {...pending,publishedUrl:uploaded.url};
    await save(pending);
  }
  const response = await transport(`${endpoint}?${new URLSearchParams({id:`eq.${decision.boulderId}`,thumbnail_url:`eq.${decision.sourceUrl}`,color:`eq.${decision.color}`,color_2:decision.color2 ? `eq.${decision.color2}` : 'is.null',status:'eq.haengt',select:'id,thumbnail_url'})}`, {
    method:'PATCH',headers,body:JSON.stringify({thumbnail_url:pending.publishedUrl}),
  });
  if (!response.ok) throw new Error('Online-Übernahme fehlgeschlagen. Die lokale Bestätigung bleibt erhalten.');
  const changed = await response.json();
  if (changed.length !== 1 || changed[0].thumbnail_url !== pending.publishedUrl) throw new Error('Online-Konflikt: Es wurde kein Bild ersetzt. Bitte Bestand neu laden.');
  const published = {...pending,state:'published'}; await save(published); return published;

}
