// InterviewX server — static file host + Groq-backed LLM API.
//
// Zero dependencies; requires Node 18+ (built-in fetch).
//
//   GROQ_API_KEY=... node server.js        # or put the key in .env
//
// Endpoints:
//   GET  /api/health     -> { ok, llm: true|false, model }
//   POST /api/questions  -> { source: "llm", model, questions: [{question, category, tips}] }
//   POST /api/feedback   -> { source: "llm", model, score, justification, strengths, gaps, suggestion }
//
// When GROQ_API_KEY is missing or Groq is unreachable, the API endpoints
// return an error status and the frontend falls back to the built-in
// question bank / heuristic scoring, clearly labeled as NOT AI.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// .env loader (tiny, no deps): KEY=VALUE lines, # comments, no expansion.
// ---------------------------------------------------------------------------
function loadDotEnv() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!(key in process.env)) process.env[key] = value;
    }
}
loadDotEnv();

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_URL = process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions';

// ---------------------------------------------------------------------------
// Groq helper
// ---------------------------------------------------------------------------
async function groqChat(systemPrompt, userPrompt, maxTokens = 900) {
    if (!GROQ_API_KEY) {
        const err = new Error('GROQ_API_KEY is not configured');
        err.code = 'NO_API_KEY';
        throw err;
    }

    const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.5,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        })
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        const err = new Error(`Groq API error ${response.status}: ${body.slice(0, 300)}`);
        err.code = 'UPSTREAM_ERROR';
        err.status = response.status;
        throw err;
    }

    const data = await response.json();
    const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;
    if (!text) {
        const err = new Error('Groq returned an empty completion');
        err.code = 'UPSTREAM_ERROR';
        throw err;
    }
    return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// API handlers
// ---------------------------------------------------------------------------
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function handleQuestions(body) {
    const role = String(body.role || 'general professional').slice(0, 120);
    const difficulty = ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium';
    const count = clamp(parseInt(body.count, 10) || 6, 3, 10);

    const system = 'You are an expert interviewer who designs realistic, role-specific interview questions. Respond with JSON only.';
    const user = `Generate ${count} interview questions for a candidate applying for the role of "${role}" at ${difficulty} difficulty.

Mix behavioral and role-specific technical/domain questions (about 40/60). Each question must be answerable verbally in under two minutes.

Respond with a JSON object of exactly this shape:
{
  "questions": [
    { "question": "...", "category": "...", "tips": "one sentence of advice for answering well" }
  ]
}`;

    const result = await groqChat(system, user, 1200);

    if (!Array.isArray(result.questions) || result.questions.length === 0) {
        const err = new Error('LLM response missing questions array');
        err.code = 'BAD_LLM_OUTPUT';
        throw err;
    }

    const questions = result.questions
        .filter(q => q && typeof q.question === 'string' && q.question.trim().length > 10)
        .slice(0, count)
        .map(q => ({
            question: q.question.trim(),
            category: typeof q.category === 'string' ? q.category.trim() : 'General',
            tips: typeof q.tips === 'string' ? q.tips.trim() : 'Answer with a specific example.'
        }));

    if (questions.length === 0) {
        const err = new Error('LLM produced no usable questions');
        err.code = 'BAD_LLM_OUTPUT';
        throw err;
    }

    return { source: 'llm', model: GROQ_MODEL, role, difficulty, questions };
}

async function handleFeedback(body) {
    const question = String(body.question || '').slice(0, 500);
    const answer = String(body.answer || '').slice(0, 4000);
    const role = String(body.role || 'general professional').slice(0, 120);
    const metrics = body.metrics || {};

    if (!question || answer.trim().length < 5) {
        const err = new Error('question and answer are required');
        err.code = 'BAD_REQUEST';
        throw err;
    }

    const system = 'You are a strict, fair interview coach. You evaluate transcribed spoken answers honestly — the transcript may contain speech-to-text artifacts, so judge content over punctuation. Respond with JSON only.';
    const user = `Role the candidate is interviewing for: ${role}

Interview question: "${question}"

Candidate's transcribed answer: "${answer}"

Delivery metrics (measured locally by the app, judge them yourself too):
- response time: ${Math.round(metrics.responseTime || 0)}s
- word count: ${metrics.wordCount || 0}
- filler words detected: ${metrics.fillerCount || 0}

Evaluate on a 1-10 rubric:
- 9-10: exceptional — directly answers, specific evidence/examples, clear structure
- 7-8: strong — answers well with some specifics, minor gaps
- 5-6: adequate — addresses the question but generic or thin on evidence
- 3-4: weak — vague, off-topic in places, or far too short/long
- 1-2: poor — does not answer the question, incoherent, or gibberish

Be strict: a generic answer with no concrete example must not score above 6.

Respond with a JSON object of exactly this shape:
{
  "score": <integer 1-10>,
  "justification": "2-3 sentences explaining exactly why this score, referencing the rubric",
  "strengths": ["specific strength", "..."],
  "gaps": ["specific gap or weakness", "..."],
  "suggestion": "the single most impactful concrete change for next time"
}`;

    const result = await groqChat(system, user, 700);

    const score = clamp(Math.round(Number(result.score) || 0), 1, 10);
    return {
        source: 'llm',
        model: GROQ_MODEL,
        score,
        justification: String(result.justification || 'No justification returned.'),
        strengths: (Array.isArray(result.strengths) ? result.strengths : []).map(String).slice(0, 5),
        gaps: (Array.isArray(result.gaps) ? result.gaps : []).map(String).slice(0, 5),
        suggestion: String(result.suggestion || 'Add one concrete example with a measurable result.')
    };
}

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------
const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg',
    '.woff2': 'font/woff2'
};

function sendJSON(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk;
            if (data.length > 1e6) { reject(new Error('Body too large')); req.destroy(); }
        });
        req.on('end', () => {
            try { resolve(data ? JSON.parse(data) : {}); }
            catch { reject(new Error('Invalid JSON body')); }
        });
        req.on('error', reject);
    });
}

function errorStatus(err) {
    switch (err.code) {
        case 'NO_API_KEY': return 503;
        case 'BAD_REQUEST': return 400;
        case 'BAD_LLM_OUTPUT': return 502;
        case 'UPSTREAM_ERROR': return 502;
        default: return 500;
    }
}

function serveStatic(req, res) {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);
    // Prevent path traversal and never serve secrets.
    if (!filePath.startsWith(ROOT) || path.basename(filePath) === '.env') {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(content);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;

    if (url === '/api/health' && req.method === 'GET') {
        return sendJSON(res, 200, { ok: true, llm: Boolean(GROQ_API_KEY), model: GROQ_API_KEY ? GROQ_MODEL : null });
    }

    if (url === '/api/questions' && req.method === 'POST') {
        try {
            return sendJSON(res, 200, await handleQuestions(await readBody(req)));
        } catch (err) {
            console.error('[questions]', err.message);
            return sendJSON(res, errorStatus(err), { error: err.code || 'INTERNAL', message: err.message });
        }
    }

    if (url === '/api/feedback' && req.method === 'POST') {
        try {
            return sendJSON(res, 200, await handleFeedback(await readBody(req)));
        } catch (err) {
            console.error('[feedback]', err.message);
            return sendJSON(res, errorStatus(err), { error: err.code || 'INTERNAL', message: err.message });
        }
    }

    if (url.startsWith('/api/')) return sendJSON(res, 404, { error: 'NOT_FOUND' });

    serveStatic(req, res);
});

server.listen(PORT, () => {
    console.log(`InterviewX running at http://localhost:${PORT}`);
    console.log(GROQ_API_KEY
        ? `LLM: Groq ${GROQ_MODEL}`
        : 'LLM: DISABLED (no GROQ_API_KEY) — app will run in labeled offline mode');
});
