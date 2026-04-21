import { getAdminDb } from './firebase-admin.js';

const IDEA_COLLECTION = 'ideas';
const PROBLEM_COLLECTION = 'problems';
const PROJECT_COLLECTION = 'projects';

function withFirestoreErrorMessage(error) {
  const message = String(error?.message || '');
  const lowerMessage = message.toLowerCase();
  const lowerCode = String(error?.code || '').toLowerCase();

  if (message.includes('firestore.googleapis.com') || message.toLowerCase().includes('firestore api has not been used')) {
    const wrapped = new Error(
      'Firestore is not enabled for this Firebase project. Enable Cloud Firestore in Firebase Console to continue.'
    );
    wrapped.cause = error;
    throw wrapped;
  }

  if (
    lowerCode.includes('permission-denied') ||
    lowerCode === '7' ||
    lowerMessage.includes('permission_denied') ||
    lowerMessage.includes('missing or insufficient permissions')
  ) {
    const serviceAccount = process.env.FIREBASE_CLIENT_EMAIL || 'your Firebase service account';
    const wrapped = new Error(
      `Firestore IAM denied access for ${serviceAccount}. Grant this account the Cloud Datastore User role in project ${process.env.FIREBASE_PROJECT_ID || ''} and retry.`
    );
    wrapped.cause = error;
    throw wrapped;
  }

  throw error;
}

function normalizeCollectionSnapshot(snapshot) {
  return snapshot.docs.map((doc) => ({ ...doc.data() }));
}

export async function getIdeas() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(IDEA_COLLECTION).get();
    return normalizeCollectionSnapshot(snapshot);
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function getIdeasByUser(userId) {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(IDEA_COLLECTION).where('userId', '==', userId).get();
    return normalizeCollectionSnapshot(snapshot);
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function addIdea(idea) {
  try {
    const db = getAdminDb();
    await db.collection(IDEA_COLLECTION).doc(idea.id).set(idea);
    return idea;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function updateIdeaStatus(id, status) {
  try {
    const db = getAdminDb();
    const ideaRef = db.collection(IDEA_COLLECTION).doc(id);
    const existing = await ideaRef.get();

    if (!existing.exists) {
      return null;
    }

    const updated = {
      ...existing.data(),
      status,
      reviewedAt: new Date().toISOString()
    };

    await ideaRef.set(updated);
    return updated;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function getProblems() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(PROBLEM_COLLECTION).get();
    return normalizeCollectionSnapshot(snapshot);
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function getProblemsByUser(userId) {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(PROBLEM_COLLECTION).where('userId', '==', userId).get();
    return normalizeCollectionSnapshot(snapshot);
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function addProblem(problem) {
  try {
    const db = getAdminDb();
    await db.collection(PROBLEM_COLLECTION).doc(problem.id).set(problem);
    return problem;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function getProblemById(id) {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(PROBLEM_COLLECTION).doc(id).get();
    if (!snapshot.exists) {
      return null;
    }

    return { ...snapshot.data() };
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function updateProblem(id, updates) {
  try {
    const db = getAdminDb();
    const problemRef = db.collection(PROBLEM_COLLECTION).doc(id);
    const existing = await problemRef.get();

    if (!existing.exists) {
      return null;
    }

    const updated = {
      ...existing.data(),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    await problemRef.set(updated);
    return updated;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function incrementProblemViews(id) {
  try {
    const db = getAdminDb();
    const problemRef = db.collection(PROBLEM_COLLECTION).doc(id);
    const existing = await problemRef.get();

    if (!existing.exists) {
      return null;
    }

    const existingData = existing.data() || {};
    const nextViews = Math.max(0, Number(existingData.views || 0) + 1);
    const updated = {
      ...existingData,
      views: nextViews,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await problemRef.set(updated);
    return updated;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function toggleProblemVote(id, user) {
  try {
    const db = getAdminDb();
    const problemRef = db.collection(PROBLEM_COLLECTION).doc(id);
    const existing = await problemRef.get();

    if (!existing.exists) {
      return null;
    }

    const existingData = existing.data() || {};
    const votedBy = Array.isArray(existingData.votedBy) ? existingData.votedBy : [];
    const hasVoted = votedBy.includes(user.uid);
    const nextVotedBy = hasVoted
      ? votedBy.filter((item) => item !== user.uid)
      : [...votedBy, user.uid];
    const updated = {
      ...existingData,
      votedBy: nextVotedBy,
      votes: nextVotedBy.length,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await problemRef.set(updated);
    return updated;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function toggleProblemFollow(id, user) {
  try {
    const db = getAdminDb();
    const problemRef = db.collection(PROBLEM_COLLECTION).doc(id);
    const existing = await problemRef.get();

    if (!existing.exists) {
      return null;
    }

    const existingData = existing.data() || {};
    const followers = Array.isArray(existingData.followers) ? existingData.followers : [];
    const alreadyFollowing = followers.includes(user.uid);
    const nextFollowers = alreadyFollowing
      ? followers.filter((item) => item !== user.uid)
      : [...followers, user.uid];
    const updated = {
      ...existingData,
      followers: nextFollowers,
      followerCount: nextFollowers.length,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await problemRef.set(updated);
    return updated;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function addProblemComment(id, user, message) {
  try {
    const db = getAdminDb();
    const problemRef = db.collection(PROBLEM_COLLECTION).doc(id);
    const existing = await problemRef.get();

    if (!existing.exists) {
      return null;
    }

    const existingData = existing.data() || {};
    const comments = Array.isArray(existingData.comments) ? existingData.comments : [];
    const createdAt = new Date().toISOString();
    const nextComment = {
      id: `COMMENT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user.uid,
      userEmail: user.email || '',
      authorName: user.email || 'Community User',
      message,
      createdAt
    };

    const nextComments = [...comments, nextComment];
    const updated = {
      ...existingData,
      comments: nextComments,
      replies: nextComments.length,
      lastActivityAt: createdAt,
      updatedAt: createdAt
    };

    await problemRef.set(updated);
    return updated;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function getProjects() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(PROJECT_COLLECTION).get();
    return normalizeCollectionSnapshot(snapshot);
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function addProject(project) {
  try {
    const db = getAdminDb();
    await db.collection(PROJECT_COLLECTION).doc(project.id).set(project);
    return project;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function updateProject(id, updates) {
  try {
    const db = getAdminDb();
    const projectRef = db.collection(PROJECT_COLLECTION).doc(id);
    const existing = await projectRef.get();

    if (!existing.exists) {
      return null;
    }

    const updated = {
      ...existing.data(),
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    await projectRef.set(updated);
    return updated;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}

export async function deleteProject(id) {
  try {
    const db = getAdminDb();
    const projectRef = db.collection(PROJECT_COLLECTION).doc(id);
    const existing = await projectRef.get();

    if (!existing.exists) {
      return false;
    }

    await projectRef.delete();
    return true;
  } catch (error) {
    withFirestoreErrorMessage(error);
  }
}
