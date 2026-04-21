import formidable from 'formidable';
import path from 'path';
import { siteData } from '../src/data/siteData.js';
import {
  addIdea,
  addProblem,
  addProject,
  addProblemComment,
  deleteProject,
  getIdeas,
  getIdeasByUser,
  getProblemById,
  getProblems,
  getProblemsByUser,
  getProjects,
  incrementProblemViews,
  toggleProblemFollow,
  toggleProblemVote,
  updateIdeaStatus,
  updateProblem
} from './_lib/submission-store.js';
import { isAdminAuthorized } from './_lib/admin-auth.js';
import { getAuthenticatedUser } from './_lib/user-auth.js';
import { getAdminDb, getAdminStorageBucket } from './_lib/firebase-admin.js';

const PROBLEM_COLLECTION = 'problems';
const PROJECT_COLLECTION = 'projects';
const SOLUTION_COLLECTION = 'solutions';
const MAX_FEATURED_PROJECTS = 3;
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: false
  }
};

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods);
  return json(res, 405, { message: 'Method not allowed' });
}

function getRouteName(req) {
  const pathname = new URL(req.url || '/api', 'http://localhost').pathname;
  return pathname.replace(/^\/api\/?/, '').replace(/^\/+/, '').replace(/\/$/, '');
}

async function readJsonBody(req) {
  if (req?.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req?.body === 'string') {
    const rawBody = req.body.trim();
    if (!rawBody) {
      return {};
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      throw new Error('Invalid JSON body.');
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

function createIdeaId() {
  return `IDEA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createProblemId() {
  return `PROBLEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createProjectId() {
  return `PROJECT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createSolutionId() {
  return `SOLUTION-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function sortByNewest(items, timestampSelector) {
  return [...items].sort((left, right) => timestampSelector(right) - timestampSelector(left));
}

function sortProjects(projects) {
  return sortByNewest(projects, (project) => new Date(project.updatedAt || project.createdAt || 0).getTime());
}

function sortIdeas(ideas) {
  return sortByNewest(ideas, (idea) => new Date(idea.submittedAt || 0).getTime());
}

function sortUserProblems(problems) {
  return sortByNewest(problems, (problem) => new Date(problem.submittedAt || 0).getTime());
}

function sortProblemsByAdmin(problems) {
  return sortByNewest(problems, (problem) => new Date(problem.updatedAt || problem.lastActivityAt || problem.submittedAt || 0).getTime());
}

function sortVisibleProblems(problems) {
  return [...problems]
    .filter((problem) => ['open', 'active', 'solved'].includes(String(problem.status || '').toLowerCase()))
    .sort((left, right) => {
      const leftActivity = new Date(left.lastActivityAt || left.updatedAt || left.submittedAt || 0).getTime();
      const rightActivity = new Date(right.lastActivityAt || right.updatedAt || right.submittedAt || 0).getTime();

      if (leftActivity !== rightActivity) {
        return rightActivity - leftActivity;
      }

      const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.POSITIVE_INFINITY;
      const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.POSITIVE_INFINITY;
      return leftDeadline - rightDeadline;
    });
}

function sortSolutions(solutions) {
  return sortByNewest(solutions, (solution) => new Date(solution.updatedAt || solution.submittedAt || 0).getTime());
}

function normalizeProjectInput(body = {}) {
  return {
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim(),
    team: String(body.team || '').trim(),
    category: String(body.category || '').trim(),
    thumbnailUrl: String(body.thumbnailUrl || '').trim(),
    externalUrl: String(body.externalUrl || '').trim(),
    externalLabel: String(body.externalLabel || '').trim(),
    featured: Boolean(body.featured)
  };
}

function validateProjectInput(project) {
  if (!project.name || !project.description || !project.team || !project.category) {
    return 'Name, description, team, and category are required.';
  }

  return '';
}

async function getFeaturedProjectCount() {
  const db = getAdminDb();
  const snapshot = await db.collection(PROJECT_COLLECTION).where('featured', '==', true).get();
  return snapshot.size;
}

async function getPublicProjects() {
  try {
    const projects = await getProjects();
    const sourceProjects = Array.isArray(projects) && projects.length > 0 ? projects : siteData.projects;
    return sortProjects(sourceProjects || []);
  } catch {
    return sortProjects(siteData.projects || []);
  }
}

async function seedProjectsIfNeeded() {
  const existing = await getProjects();
  if (Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  let seededFeaturedCount = 0;
  const seededProjects = (siteData.projects || []).map((project) => {
    const wantsFeatured = Boolean(project.featured);
    const featured = wantsFeatured && seededFeaturedCount < MAX_FEATURED_PROJECTS;
    if (featured) {
      seededFeaturedCount += 1;
    }

    return {
      ...project,
      thumbnailUrl: String(project.thumbnailUrl || project.thumbnail || ''),
      featured,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });

  await Promise.all(seededProjects.map((project) => addProject(project)));
  return seededProjects;
}

async function handleAdminAuth(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const authorized = await isAdminAuthorized(req);
  return json(res, 200, { authorized: Boolean(authorized) });
}

async function handleProjects(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const projects = await getPublicProjects();
  return json(res, 200, { projects });
}

async function handleAdminProjects(req, res) {
  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const projects = await seedProjectsIfNeeded();
    return json(res, 200, { projects: sortProjects(projects || []) });
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const normalized = normalizeProjectInput(body || {});
    const validationError = validateProjectInput(normalized);

    if (validationError) {
      return json(res, 400, { message: validationError });
    }

    if (normalized.featured) {
      const featuredCount = await getFeaturedProjectCount();
      if (featuredCount >= MAX_FEATURED_PROJECTS) {
        return json(res, 400, { message: `Only ${MAX_FEATURED_PROJECTS} projects can be featured on home page.` });
      }
    }

    const timestamp = new Date().toISOString();
    const record = {
      id: createProjectId(),
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await addProject(record);
    return json(res, 200, { message: 'Project created successfully.', project: record });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

async function handleUpdateProject(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const body = await readJsonBody(req);
  const id = String(body?.id || '').trim();

  if (!id) {
    return json(res, 400, { message: 'Project id is required.' });
  }

  const normalized = normalizeProjectInput(body || {});
  const validationError = validateProjectInput(normalized);

  if (validationError) {
    return json(res, 400, { message: validationError });
  }

  const db = getAdminDb();
  const projectRef = db.collection(PROJECT_COLLECTION).doc(id);
  const snapshot = await projectRef.get();

  if (!snapshot.exists) {
    return json(res, 404, { message: 'Project not found.' });
  }

  const existingProject = snapshot.data() || {};
  if (normalized.featured && !existingProject.featured) {
    const featuredCount = await getFeaturedProjectCount();
    if (featuredCount >= MAX_FEATURED_PROJECTS) {
      return json(res, 400, { message: `Only ${MAX_FEATURED_PROJECTS} projects can be featured on home page.` });
    }
  }

  const updatedProject = {
    ...existingProject,
    ...normalized,
    id,
    updatedAt: new Date().toISOString()
  };

  await projectRef.set(updatedProject);
  return json(res, 200, { message: 'Project updated successfully.', project: updatedProject });
}

async function handleDeleteProject(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const body = await readJsonBody(req);
  const id = String(body?.id || '').trim();

  if (!id) {
    return json(res, 400, { message: 'Project id is required.' });
  }

  const removed = await deleteProject(id);
  if (!removed) {
    return json(res, 404, { message: 'Project not found.' });
  }

  return json(res, 200, { message: 'Project deleted successfully.' });
}

async function handleIdeas(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const ideas = sortIdeas(await getIdeas());
  return json(res, 200, { ideas });
}

async function handleMyIdeas(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const ideas = sortIdeas(await getIdeasByUser(user.uid));
  return json(res, 200, { ideas });
}

async function handleSubmitIdea(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return json(res, 401, { message: 'Please login to submit an idea.' });
  }

  const body = await readJsonBody(req);
  const { name, email, title, domain, problem, solution } = body || {};

  if (!name || !email || !title || !domain || !problem || !solution) {
    return json(res, 400, { message: 'All idea fields are required.' });
  }

  const record = {
    id: createIdeaId(),
    userId: user.uid,
    userEmail: user.email,
    name,
    email: user.email || email,
    title,
    domain,
    problem,
    solution,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  await addIdea(record);
  return json(res, 200, { message: 'Idea submitted successfully.', id: record.id, status: record.status });
}

async function handleUpdateIdeaStatus(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const body = await readJsonBody(req);
  const id = String(body?.id || '').trim();
  const status = String(body?.status || '').trim().toLowerCase();

  if (!id || !status) {
    return json(res, 400, { message: 'Idea id and status are required.' });
  }

  if (!['approved', 'rejected'].includes(status)) {
    return json(res, 400, { message: 'Status must be approved or rejected.' });
  }

  const updatedIdea = await updateIdeaStatus(id, status);
  if (!updatedIdea) {
    return json(res, 404, { message: 'Idea not found.' });
  }

  return json(res, 200, { message: 'Idea status updated successfully.', idea: updatedIdea });
}

async function handleProblems(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const problems = sortVisibleProblems(await getProblems());
  return json(res, 200, { problems });
}

async function handleAdminProblems(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const problems = sortProblemsByAdmin(await getProblems());
  return json(res, 200, { problems });
}

async function handleMyProblems(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const problems = sortUserProblems(await getProblemsByUser(user.uid));
  return json(res, 200, { problems });
}

async function handleSubmitProblem(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return json(res, 401, { message: 'Please login to submit a problem statement.' });
  }

  const body = await readJsonBody(req);
  const { name, email, title, domain, description, outcome, difficulty, deadline } = body || {};

  if (!name || !email || !title || !domain || !description || !outcome || !difficulty || !deadline) {
    return json(res, 400, { message: 'All problem statement fields are required.' });
  }

  const now = new Date().toISOString();
  const record = {
    id: createProblemId(),
    userId: user.uid,
    userEmail: user.email,
    name,
    email: user.email || email,
    title,
    domain,
    description,
    outcome,
    difficulty,
    deadline,
    status: 'open',
    submittedAt: now,
    updatedAt: now,
    lastActivityAt: now,
    views: 0,
    votes: 0,
    votedBy: [],
    followers: [],
    followerCount: 0,
    replies: 0,
    comments: []
  };

  await addProblem(record);
  return json(res, 200, { message: 'Problem statement submitted successfully.', id: record.id, status: record.status });
}

async function handleUpdateProblemStatus(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const body = await readJsonBody(req);
  const id = String(body?.id || '').trim();
  const status = String(body?.status || '').trim().toLowerCase();
  const solution = body?.solution;

  if (!id || !status) {
    return json(res, 400, { message: 'Problem id and status are required.' });
  }

  if (!['open', 'active', 'solved'].includes(status)) {
    return json(res, 400, { message: 'Status must be open, active, or solved.' });
  }

  const problem = await getProblemById(id);
  if (!problem) {
    return json(res, 404, { message: 'Problem not found.' });
  }

  const now = new Date().toISOString();
  const updates = {
    status,
    reviewedAt: now,
    lastActivityAt: now
  };

  if (status === 'solved') {
    updates.solution = {
      summary: String(solution || problem?.solution?.summary || '').trim(),
      updatedAt: now
    };
  } else if (problem.solution) {
    updates.solution = problem.solution;
  }

  const updated = await updateProblem(id, updates);
  return json(res, 200, { message: 'Problem status updated successfully.', problem: updated });
}

async function handleProblemThreadAction(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const body = await readJsonBody(req);
  const id = String(body?.id || '').trim();
  const action = String(body?.action || '').trim().toLowerCase();
  const message = String(body?.message || '').trim();

  if (!id || !action) {
    return json(res, 400, { message: 'Problem id and action are required.' });
  }

  if (action === 'view') {
    const updated = await incrementProblemViews(id);
    if (!updated) {
      return json(res, 404, { message: 'Problem not found.' });
    }

    return json(res, 200, { message: 'View recorded.', problem: updated });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return json(res, 401, { message: 'Please login to perform this action.' });
  }

  if (action === 'vote') {
    const updated = await toggleProblemVote(id, user);
    if (!updated) {
      return json(res, 404, { message: 'Problem not found.' });
    }

    return json(res, 200, { message: 'Vote updated.', problem: updated });
  }

  if (action === 'follow') {
    const updated = await toggleProblemFollow(id, user);
    if (!updated) {
      return json(res, 404, { message: 'Problem not found.' });
    }

    return json(res, 200, { message: 'Follow state updated.', problem: updated });
  }

  if (action === 'comment') {
    if (!message) {
      return json(res, 400, { message: 'Comment message is required.' });
    }

    const updated = await addProblemComment(id, user, message);
    if (!updated) {
      return json(res, 404, { message: 'Problem not found.' });
    }

    return json(res, 200, { message: 'Comment added.', problem: updated });
  }

  const problem = await getProblemById(id);
  if (!problem) {
    return json(res, 404, { message: 'Problem not found.' });
  }

  return json(res, 400, { message: 'Unsupported action.' });
}

async function handleProblemSolutions(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const problemId = String(new URL(req.url || '/api', 'http://localhost').searchParams.get('problemId') || '').trim();
  if (!problemId) {
    return json(res, 400, { message: 'problemId query is required.' });
  }

  const db = getAdminDb();
  const snapshot = await db.collection(SOLUTION_COLLECTION).where('problemId', '==', problemId).get();
  const solutions = sortSolutions(snapshot.docs.map((doc) => ({ ...doc.data() })));
  return json(res, 200, { solutions });
}

function parseMultipartRequest(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_ARCHIVE_BYTES
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function getFirstFieldValue(fields, key) {
  const value = fields?.[key];
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

function getSingleFile(files, key) {
  const file = files?.[key];
  if (!file) {
    return null;
  }

  return Array.isArray(file) ? file[0] : file;
}

async function handleSubmitSolution(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return json(res, 401, { message: 'Please login to submit a solution.' });
  }

  let formPayload;
  try {
    formPayload = await parseMultipartRequest(req);
  } catch (parseError) {
    return json(res, 400, { message: parseError.message || 'Unable to read uploaded form data.' });
  }

  const { fields, files } = formPayload;
  const normalizedProblemId = getFirstFieldValue(fields, 'problemId');
  const normalizedSummary = getFirstFieldValue(fields, 'summary');
  const normalizedDetails = getFirstFieldValue(fields, 'details');

  if (!normalizedProblemId || !normalizedSummary || !normalizedDetails) {
    return json(res, 400, { message: 'Problem, summary, and details are required.' });
  }

  const db = getAdminDb();
  const problemRef = db.collection(PROBLEM_COLLECTION).doc(normalizedProblemId);
  const problemSnapshot = await problemRef.get();

  if (!problemSnapshot.exists) {
    return json(res, 404, { message: 'Problem not found.' });
  }

  let codeArchiveUrl = '';
  let codeArchiveName = '';
  let codeArchiveSize = 0;
  let archiveUploadWarning = '';

  const zipFile = getSingleFile(files, 'codeArchive');
  if (zipFile) {
    const extension = path.extname(zipFile.originalFilename || '').toLowerCase();
    if (extension !== '.zip') {
      return json(res, 400, { message: 'Only ZIP files are allowed for code archive.' });
    }

    codeArchiveName = zipFile.originalFilename || 'solution.zip';
    codeArchiveSize = Number(zipFile.size || 0);

    try {
      const bucket = getAdminStorageBucket();
      const destination = `solution-archives/${normalizedProblemId}/${createSolutionId()}-${codeArchiveName}`;

      await bucket.upload(zipFile.filepath, {
        destination,
        resumable: false,
        metadata: {
          contentType: zipFile.mimetype || 'application/zip'
        }
      });

      const uploadedFile = bucket.file(destination);
      const [signedUrl] = await uploadedFile.getSignedUrl({
        action: 'read',
        expires: '03-01-2500'
      });

      codeArchiveUrl = signedUrl;
    } catch (storageError) {
      console.error('[submit-solution] ZIP upload failed:', storageError);
      archiveUploadWarning = storageError?.message || 'Unable to upload ZIP archive.';
      codeArchiveUrl = '';
      codeArchiveName = '';
      codeArchiveSize = 0;
    }
  }

  const now = new Date().toISOString();
  const record = {
    id: createSolutionId(),
    problemId: normalizedProblemId,
    problemTitle: getFirstFieldValue(fields, 'problemTitle'),
    userId: user.uid,
    userEmail: user.email || '',
    authorName: user.email || 'Community User',
    summary: normalizedSummary,
    details: normalizedDetails,
    demoUrl: getFirstFieldValue(fields, 'demoUrl'),
    repoUrl: getFirstFieldValue(fields, 'repoUrl'),
    teamMembers: getFirstFieldValue(fields, 'teamMembers'),
    codeArchiveUrl,
    codeArchiveName,
    codeArchiveSize,
    archiveUploadWarning,
    status: 'submitted',
    submittedAt: now,
    updatedAt: now,
    reviewedAt: '',
    reviewNote: ''
  };

  await db.collection(SOLUTION_COLLECTION).doc(record.id).set(record);

  const existingProblem = problemSnapshot.data() || {};
  await problemRef.set({
    ...existingProblem,
    id: normalizedProblemId,
    status: existingProblem.status === 'open' ? 'active' : existingProblem.status,
    solutionCount: Math.max(0, Number(existingProblem.solutionCount || 0)) + 1,
    lastActivityAt: now,
    updatedAt: now
  });

  const responseMessage = archiveUploadWarning
    ? 'Solution submitted, but ZIP upload failed. Check Firebase Storage bucket permissions.'
    : 'Solution submitted successfully.';

  return json(res, 200, {
    message: responseMessage,
    archiveUploadWarning,
    solution: record
  });
}

async function handleAdminSolutions(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const db = getAdminDb();
  const snapshot = await db.collection(SOLUTION_COLLECTION).get();
  const solutions = sortSolutions(snapshot.docs.map((doc) => ({ ...doc.data() })));
  return json(res, 200, { solutions });
}

async function handleMySolutions(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const db = getAdminDb();
  const snapshot = await db.collection(SOLUTION_COLLECTION).where('userId', '==', user.uid).get();
  const solutions = sortSolutions(snapshot.docs.map((doc) => ({ ...doc.data() })));
  return json(res, 200, { solutions });
}

async function handleUpdateSolutionStatus(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await isAdminAuthorized(req))) {
    return json(res, 401, { message: 'Unauthorized' });
  }

  const body = await readJsonBody(req);
  const id = String(body?.id || '').trim();
  const status = String(body?.status || '').trim().toLowerCase();
  const reviewNote = String(body?.reviewNote || '').trim();

  if (!id || !status) {
    return json(res, 400, { message: 'Solution id and status are required.' });
  }

  if (!['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'].includes(status)) {
    return json(res, 400, { message: 'Invalid solution status.' });
  }

  const db = getAdminDb();
  const solutionRef = db.collection(SOLUTION_COLLECTION).doc(id);
  const solutionSnapshot = await solutionRef.get();

  if (!solutionSnapshot.exists) {
    return json(res, 404, { message: 'Solution not found.' });
  }

  const existingSolution = solutionSnapshot.data() || {};
  const now = new Date().toISOString();
  const updatedSolution = {
    ...existingSolution,
    status,
    reviewNote,
    reviewedAt: now,
    updatedAt: now
  };

  await solutionRef.set(updatedSolution);

  if (status === 'accepted') {
    const problemId = String(existingSolution.problemId || '').trim();
    if (problemId) {
      const problemRef = db.collection(PROBLEM_COLLECTION).doc(problemId);
      const problemSnapshot = await problemRef.get();
      if (problemSnapshot.exists) {
        const existingProblem = problemSnapshot.data() || {};
        await problemRef.set({
          ...existingProblem,
          id: problemId,
          status: 'solved',
          solution: {
            solutionId: updatedSolution.id,
            summary: updatedSolution.summary,
            authorName: updatedSolution.authorName,
            updatedAt: now
          },
          lastActivityAt: now,
          updatedAt: now
        });
      }
    }
  }

  return json(res, 200, { message: 'Solution status updated.', solution: updatedSolution });
}

async function handleRoute(req, res) {
  const route = getRouteName(req);

  switch (route) {
    case 'admin-auth':
      return handleAdminAuth(req, res);
    case 'projects':
      return handleProjects(req, res);
    case 'admin-projects':
      return handleAdminProjects(req, res);
    case 'update-project':
      return handleUpdateProject(req, res);
    case 'delete-project':
      return handleDeleteProject(req, res);
    case 'ideas':
      return handleIdeas(req, res);
    case 'my-ideas':
      return handleMyIdeas(req, res);
    case 'submit-idea':
      return handleSubmitIdea(req, res);
    case 'update-idea-status':
      return handleUpdateIdeaStatus(req, res);
    case 'problems':
      return handleProblems(req, res);
    case 'admin-problems':
      return handleAdminProblems(req, res);
    case 'my-problems':
      return handleMyProblems(req, res);
    case 'submit-problem':
      return handleSubmitProblem(req, res);
    case 'update-problem-status':
      return handleUpdateProblemStatus(req, res);
    case 'problem-thread-action':
      return handleProblemThreadAction(req, res);
    case 'problem-solutions':
      return handleProblemSolutions(req, res);
    case 'submit-solution':
      return handleSubmitSolution(req, res);
    case 'admin-solutions':
      return handleAdminSolutions(req, res);
    case 'my-solutions':
      return handleMySolutions(req, res);
    case 'update-solution-status':
      return handleUpdateSolutionStatus(req, res);
    default:
      return json(res, 404, { message: 'Not found' });
  }
}

export default async function handler(req, res) {
  try {
    return await handleRoute(req, res);
  } catch (error) {
    console.error('[api-router] Unhandled error:', error);
    return json(res, 500, { message: error?.message || 'Internal server error' });
  }
}