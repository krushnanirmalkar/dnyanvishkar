import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, 'api');

function createApiResponse(res) {
  let statusCode = 200;

  return {
    status(code) {
      statusCode = code;
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    json(payload) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.statusCode = statusCode;
      res.end(JSON.stringify(payload));
      return this;
    },
    send(payload) {
      res.statusCode = statusCode;
      res.end(payload);
      return this;
    },
    end(payload) {
      res.statusCode = statusCode;
      res.end(payload);
      return this;
    }
  };
}

async function readRequestBody(req) {
  const contentType = req.headers['content-type'] || '';

  // Multipart bodies must be read by the route handler (e.g. formidable).
  if (contentType.includes('multipart/form-data')) {
    return null;
  }

  const chunks = [];

  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });

  if (!chunks.length) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return {};
    }
  }

  return rawBody;
}

async function resolveLocalApiHandler(routePath) {
  const exactHandlerFile = path.join(apiRoot, `${routePath}.js`);
  const catchAllHandlerFile = path.join(apiRoot, '[...route].js');

  try {
    await fs.access(exactHandlerFile);
    return exactHandlerFile;
  } catch {
    try {
      await fs.access(catchAllHandlerFile);
      return catchAllHandlerFile;
    } catch {
      return null;
    }
  }
}

function localApiPlugin() {
  return {
    name: 'local-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const parsedUrl = new URL(req.url, 'http://localhost');
        const routePath = parsedUrl.pathname.replace(/^\/api\//, '');

        if (!routePath || routePath.includes('..')) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ message: 'Invalid API route.' }));
          return;
        }

        const handlerFile = await resolveLocalApiHandler(routePath);

        if (!handlerFile) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ message: 'API route not found.' }));
          return;
        }

        try {
          req.body = await readRequestBody(req);
          req.query = Object.fromEntries(parsedUrl.searchParams.entries());

          const moduleUrl = `${pathToFileURL(handlerFile).href}?t=${Date.now()}`;
          const apiModule = await import(moduleUrl);
          const handler = apiModule.default;

          if (typeof handler !== 'function') {
            throw new Error(`Invalid handler export in ${routePath}.js`);
          }

          const apiRes = createApiResponse(res);
          await handler(req, apiRes);

          if (!res.writableEnded) {
            apiRes.status(204).end();
          }
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              message: error?.message || 'Local API error.'
            })
          );
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // Expose .env/.env.local values to the local API middleware (Node side).
  const env = loadEnv(mode, process.cwd(), '');
  Object.entries(env).forEach(([key, value]) => {
    if (typeof process.env[key] === 'undefined') {
      process.env[key] = value;
    }
  });

  return {
    plugins: [react(), localApiPlugin()],
    server: {
      headers: {
        // Required for Firebase popup auth flows on localhost.
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
      }
    }
  };
});
