import { getAdminAuth } from './firebase-admin.js';

function getBearerToken(req) {
  const header = req?.headers?.authorization ?? req?.headers?.Authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return '';
  }

  return header.slice('Bearer '.length).trim();
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] Missing bearer token in request.');
    }
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || ''
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] Firebase token verification failed:', error?.code || error?.message || error);
    }
    return null;
  }
}
