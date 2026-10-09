type EmailAuthClient = {
  exchangeCodeForSession: (code: string) => Promise<{ error: unknown }>;
  setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<{ error: unknown }>;
  getSession: () => Promise<{ data: { session: unknown }; error?: unknown }>;
};

export function emailRedirectUrl(path: string, native: boolean, origin: string, publicSite?: string): string {
  const base = new URL(native ? publicSite || 'https://beta.kletterwelt-sauerland.de' : origin);
  if (native && (base.protocol !== 'https:' || base.username || base.password)) {
    throw new Error('Die öffentliche App-Adresse ist ungültig.');
  }
  return new URL(path, base.origin).href;
}

export function safeNextPath(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/';
}

// The client disables automatic URL detection. Exchange the email credentials
// explicitly, then let the page remove them from browser history.
export async function completeEmailSession(auth: EmailAuthClient, search: string, hash: string): Promise<boolean> {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const read = (name: string) => query.get(name) || fragment.get(name);
  if (read('error') || read('error_description')) throw new Error('Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
  const code = read('code');
  const access_token = read('access_token');
  const refresh_token = read('refresh_token');
  if (code) {
    const { error } = await auth.exchangeCodeForSession(code);
    if (error) throw new Error('Der Link konnte nicht bestätigt werden. Bitte fordere einen neuen Link an.');
  } else if (access_token && refresh_token) {
    const { error } = await auth.setSession({ access_token, refresh_token });
    if (error) throw new Error('Der Link konnte nicht bestätigt werden. Bitte fordere einen neuen Link an.');
  } else if (access_token || refresh_token) {
    throw new Error('Der Link ist unvollständig. Bitte fordere einen neuen Link an.');
  }
  const { data, error } = await auth.getSession();
  if (error || !data.session) throw new Error('Bitte öffne einen gültigen Link aus der E-Mail.');
  return read('type') === 'recovery';
}
