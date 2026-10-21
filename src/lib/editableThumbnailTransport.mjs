/** Archive first, then publish the variant and its editing source atomically.
 * Keep upload receipts across retry so a lost commit response is recoverable. */
export async function saveEditableThumbnail(input, receipt, effects) {
  if (!receipt.originalUrl) receipt.originalUrl = input.sourceUrl || await effects.uploadOriginal();
  if (!receipt.originalUrl) throw new Error('Das Originalfoto wurde nicht bestätigt. Bitte erneut speichern.');
  if (!receipt.thumbnailUrl) receipt.thumbnailUrl = input.sameFile ? receipt.originalUrl : await effects.uploadThumbnail();
  if (!receipt.thumbnailUrl) throw new Error('Das Vorschaubild wurde nicht bestätigt. Bitte erneut speichern.');
  await effects.commit({
    p_boulder_id: input.boulderId, p_expected_url: input.expectedUrl,
    p_thumbnail_url: receipt.thumbnailUrl, p_original_url: receipt.originalUrl,
    p_original_sha256: input.originalHash, p_selection: input.selection,
    p_color: input.color, p_color_2: input.color2, p_volume_only: input.volumeOnly,
  });
}
