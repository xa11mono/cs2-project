#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DEFAULT_PORT = 47831;
const MAX_JSON_BYTES = 24 * 1024 * 1024;
const MAX_IMAGE_BYTES = 18 * 1024 * 1024;
const CLIENT_HEADER = 'x-cs2-jersey-client';
const OUTPUT_DIR = path.join(ROOT, 'assets', 'media', 'generated-jerseys');

function loadEnv(file) {
  return readFile(file, 'utf8').then(source => {
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }).catch(() => {});
}

export function safeSlug(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'unknown';
}

export function resolveSourcePath(relativePath, root = ROOT) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) throw new Error('sourcePath is required');
  let decoded;
  try { decoded = decodeURIComponent(relativePath).replace(/\\/g, '/').split('?')[0].replace(/^\.\//, ''); }
  catch { throw new Error('Invalid source path'); }
  if (!/^assets\/media\/players\/[a-z0-9._/-]+$/i.test(decoded) || decoded.includes('/../') || decoded.endsWith('/..')) {
    throw new Error('Only original player images under assets/media/players are allowed');
  }
  const base = path.resolve(root, 'assets', 'media', 'players') + path.sep;
  const resolved = path.resolve(root, decoded);
  if (!resolved.startsWith(base)) throw new Error('Source path escaped the player media directory');
  return resolved;
}

export function sniffImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: 'image/png', ext: 'png' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

async function readRequest(req, limit = MAX_JSON_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Request body is too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function json(res, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function originAllowed(origin) {
  if (!origin || origin === 'null') return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}
function applyCors(req, res) {
  const origin = req.headers.origin || 'null';
  if (!originAllowed(req.headers.origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CS2-Jersey-Client');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}
function validateRequest(req) {
  if (req.headers[CLIENT_HEADER] !== 'v147') throw Object.assign(new Error('Missing CS2 jersey client header'), { statusCode: 403 });
  if (req.headers.host && !/^(127\.0\.0\.1|localhost):\d+$/i.test(req.headers.host)) throw Object.assign(new Error('Invalid Host header'), { statusCode: 403 });
}
async function getSource(body) {
  let buffer;
  if (typeof body.sourcePath === 'string') {
    const source = resolveSourcePath(body.sourcePath);
    buffer = await readFile(source);
  } else if (typeof body.sourceDataUrl === 'string') {
    const match = body.sourceDataUrl.match(/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=\r\n]+)$/i);
    if (!match) throw new Error('sourceDataUrl must be a PNG, JPEG or WEBP data URL');
    buffer = Buffer.from(match[2], 'base64');
  } else {
    throw new Error('Provide sourcePath or sourceDataUrl');
  }
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error('Source image is empty or exceeds 18 MB');
  const image = sniffImage(buffer);
  if (!image) throw new Error('Unsupported or invalid source image. Use PNG, JPEG or WEBP.');
  return { buffer, image };
}
function makePrompt(body) {
  const teamName = String(body.teamName || '').trim().slice(0, 90);
  const description = String(body.kitDescription || '').trim().slice(0, 600);
  const primary = /^#[0-9a-f]{6}$/i.test(body.primaryColor || '') ? body.primaryColor : '#18232d';
  const secondary = /^#[0-9a-f]{6}$/i.test(body.secondaryColor || '') ? body.secondaryColor : '#111820';
  const userPrompt = String(body.prompt || '').trim().slice(0, 1800);
  if (!teamName) throw new Error('teamName is required');
  return userPrompt || [
    'Edit only the shirt of the player in the input photograph. Preserve identity, face, hair, neck, skin, expression, pose, hands, body, background, camera framing and lighting.',
    'Create a realistic professional esports team jersey for ' + teamName + '.',
    'Kit description: ' + (description || 'modern, restrained, premium esports jersey') + '.',
    'Main color ' + primary + '; secondary color ' + secondary + '.',
    'Natural fabric folds and seams. No invented readable text, sponsor names, numbers or logos. Do not alter any pixels outside the clothing.'
  ].join(' ');
}
async function infer(buffer, mime, prompt) {
  if (!process.env.HF_TOKEN) throw new Error('HF_TOKEN is missing. Copy .env.example to .env and add your token.');
  const model = process.env.HF_MODEL || 'black-forest-labs/FLUX.1-Kontext-dev';
  let InferenceClient;
  try { ({ InferenceClient } = await import('@huggingface/inference')); }
  catch { throw new Error('Hugging Face SDK is not installed. Run npm install inside tools/jerseys.'); }
  const client = new InferenceClient(process.env.HF_TOKEN);
  const input = new Blob([buffer], { type: mime });
  const output = await client.imageToImage({
    model,
    inputs: input,
    parameters: {
      prompt,
      negative_prompt: 'different person, changed face, changed hair, changed skin, changed pose, extra fingers, extra arms, distorted hands, changed background, text, watermark, logo gibberish',
      num_inference_steps: 28
    }
  }, { signal: AbortSignal.timeout(180000) });
  const result = Buffer.from(await output.arrayBuffer());
  if (!result.length || result.length > MAX_IMAGE_BYTES) throw new Error('AI returned an empty or oversized image');
  const format = sniffImage(result);
  if (!format) throw new Error('AI returned an unsupported image format');
  return { buffer: result, image: format, model };
}
async function exists(file) {
  try { const s = await stat(file); return s.isFile() && s.size > 0; } catch { return false; }
}
async function generate(body) {
  const { buffer, image } = await getSource(body);
  const prompt = makePrompt(body);
  const model = process.env.HF_MODEL || 'black-forest-labs/FLUX.1-Kontext-dev';
  const fingerprint = createHash('sha256').update(buffer).update('\0').update(prompt).update('\0').update(model).digest('hex').slice(0, 20);
  const unique = body.force ? '-' + randomUUID().slice(0, 8) : '';
  const stem = safeSlug(body.nick) + '-' + safeSlug(body.teamName) + '-' +
    (body.mode === 'full' ? 'full' : 'portrait') + '-' + fingerprint + unique;
  await mkdir(OUTPUT_DIR, { recursive: true });
  let fileName = null;
  if (!body.force) {
    for (const ext of ['png', 'webp', 'jpg']) {
      const candidate = stem + '.' + ext;
      if (await exists(path.join(OUTPUT_DIR, candidate))) { fileName = candidate; break; }
    }
  }
  const cached = !!fileName;
  if (!fileName) {
    const result = await infer(buffer, image.mime, prompt);
    fileName = stem + '.' + result.image.ext;
    const destination = path.join(OUTPUT_DIR, fileName);
    const temp = destination + '.' + randomUUID() + '.tmp';
    try {
      await writeFile(temp, result.buffer, { flag: 'wx' });
      await rename(temp, destination);
    } catch (e) {
      await unlink(temp).catch(() => {});
      throw e;
    }
  }
  return { relativeUrl: 'assets/media/generated-jerseys/' + fileName, model, cached };
}

export async function startServer() {
  await loadEnv(path.join(HERE, '.env'));
  const port = Math.max(1024, Math.min(65535, Number(process.env.PORT) || DEFAULT_PORT));
  let busy = false;
  const server = createServer(async (req, res) => {
    if (!applyCors(req, res)) return json(res, 403, { error: 'Origin is not allowed. Open the game locally or from localhost.' });
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try {
      validateRequest(req);
      const url = new URL(req.url || '/', 'http://127.0.0.1:' + port);
      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, {
          ok: true,
          configured: !!process.env.HF_TOKEN,
          model: process.env.HF_MODEL || 'black-forest-labs/FLUX.1-Kontext-dev',
          storage: 'assets/media/generated-jerseys'
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/generate') {
        if (busy) return json(res, 429, { error: 'Another image is being generated. The local helper processes one request at a time.' });
        busy = true;
        try {
          const body = JSON.parse((await readRequest(req)).toString('utf8'));
          const result = await generate(body);
          return json(res, 200, result);
        } finally {
          busy = false;
        }
      }
      return json(res, 404, { error: 'Not found' });
    } catch (error) {
      const status = Number(error.statusCode) || (/HF_TOKEN|SDK is not installed/i.test(error.message) ? 503 : 400);
      console.error('[jersey-swap]', error.message);
      return json(res, status, { error: error.message || 'Generation failed' });
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log('CS2 jersey helper: http://127.0.0.1:' + port);
    console.log('Game root: ' + ROOT);
    console.log('HF_TOKEN: ' + (process.env.HF_TOKEN ? 'configured' : 'not configured (.env)'));
    console.log('Only loopback requests are accepted. Stop with Ctrl+C.');
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  startServer().catch(error => { console.error(error); process.exitCode = 1; });
}