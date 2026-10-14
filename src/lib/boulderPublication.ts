type PublishWithoutVideoOptions = {
  fetch: typeof fetch;
  url: string;
  publicKey: string;
  accessToken: string;
  boulderId: string;
};

// Only release a pending/failed, thumbnail-complete row. Never overwrite a real
// video, its processing job or a newer concurrent upload. Writes are not retried.
export async function publishBoulderWithoutVideo(options: PublishWithoutVideoOptions) {
  const filters = new URLSearchParams({
    id: `eq.${options.boulderId}`,
    beta_video_status: "in.(uploading,failed)",
    beta_video_url: "is.null",
    beta_video_urls: "is.null",
    beta_video_upload_session_id: "is.null",
    beta_video_job_id: "is.null",
    thumbnail_url: "not.is.null",
  });
  const response = await options.fetch(`${options.url}/rest/v1/boulders?${filters}`, {
    method: "PATCH",
    headers: {
      apikey: options.publicKey,
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ beta_video_status: "none" }),
  });
  if (!response.ok) throw new Error("Boulder konnte nicht veröffentlicht werden. Bitte im Setterbereich prüfen.");
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].id !== options.boulderId
    || rows[0].beta_video_status !== "none" || !rows[0].thumbnail_url || rows[0].beta_video_url
    || rows[0].beta_video_urls || rows[0].beta_video_job_id || rows[0].beta_video_upload_session_id) {
    throw new Error("Veröffentlichung nicht bestätigt. Bitte im Setterbereich prüfen.");
  }
}
