import { getAdminAuth } from './firebase-admin.js';

function getBearerToken(req) {
  const header = req?.headers?.authorization ?? req?.headers?.Authorization;
  if (typeof header !== 'string') {
    return '';
  }

  if (!header.startsWith('Bearer ')) {
    return '';
  }

  return header.slice('Bearer '.length).trim();
}

function isEmailAllowed(email) {
  const raw = process.env.ADMIN_EMAILS || '';
  const allowedEmails = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return false;
  }

  return allowedEmails.includes(String(email || '').toLowerCase());
}

export async function isAdminAuthorized(req) {
  const token = getBearerToken(req);
  if (!token) {
    return false;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded?.admin === true || isEmailAllowed(decoded?.email);
  } catch {
    return false;
  }
}
