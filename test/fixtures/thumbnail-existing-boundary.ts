// Explicit isolated boundaries; the real editor, photo loading, rendering,
// saving coordinator and server contract run with synthetic pixels only.
export const backendConfig = { supabaseUrl: 'https://beta-api.kletterwelt-sauerland.de', publicKey: 'fixture-only', environment: 'production' };
export const getCurrentSession = async () => ({ user: { id: '29a40560-e6a5-425b-9809-1862926a6d84' }, access_token: 'fixture-only' });
export const createAuthenticatedUploadFetch = () => window.fetch.bind(window);
export const authenticatedFetch = (...args: Parameters<typeof fetch>) => window.fetch(...args);
export const resumableUpload = async (file: File) => {
  const url = `${backendConfig.supabaseUrl}/storage/v1/object/public/beta-videos/editor-fixture/${crypto.randomUUID()}.png`;
  (window as unknown as { thumbnailUploads: unknown[] }).thumbnailUploads.push({ url, bytes: file.size, type: file.type });
  return { url };
};
