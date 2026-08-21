import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const REQUIRED_ROLES = (process.env.REQUIRED_ROLES || 'admin,setter')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Token -> { userId, roles, expires }; avoids hitting Supabase for every chunk.
const tokenCache = new Map();
const CACHE_TTL_MS = 60_000;

function getBearerToken(req) {
  const raw = req.headers['x-upload-auth'] || req.headers['authorization'] || '';
  if (typeof raw === 'string' && raw.toLowerCase().startsWith('bearer ')) {
    return raw.slice(7).trim();
  }
  return '';
}

export async function requireSupabaseUser(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Server auth configuration missing' });
    }

    const cached = tokenCache.get(token);
    if (cached && cached.expires > Date.now()) {
      req.userId = cached.userId;
      req.roles = [...cached.roles];
      return next();
    }

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const user = await userRes.json();
    if (!user?.id) {
      return res.status(401).json({ error: 'Unable to resolve user' });
    }

    let roles = [];
    if (REQUIRED_ROLES.length > 0) {
      const rolesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&select=role`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
      );
      if (!rolesRes.ok) {
        return res.status(403).json({ error: 'Role check failed' });
      }
      const rows = await rolesRes.json();
      roles = Array.isArray(rows) ? rows.map((row) => row.role).filter((role) => typeof role === 'string') : [];
      if (!roles.includes('admin') && !roles.some((role) => REQUIRED_ROLES.includes(role))) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    if (tokenCache.size > 500) tokenCache.clear();
    tokenCache.set(token, { userId: user.id, roles, expires: Date.now() + CACHE_TTL_MS });
    req.userId = user.id;
    req.roles = [...roles];
    next();
  } catch (err) {
    console.error('[auth] validation error:', err);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

export function isAdmin(req) { return Array.isArray(req.roles) && req.roles.includes('admin'); }
export function canAccessOwner(req, ownerId) { return isAdmin(req) || (ownerId && ownerId === req.userId); }
export function canManageBoulderMedia(req) {
  return Array.isArray(req.roles) && (req.roles.includes('admin') || req.roles.includes('setter'));
}
