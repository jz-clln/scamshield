const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load project TypeScript without adding a test-runner dependency.
function load(relative, overrides = {}) {
  const filename = path.resolve(relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const localRequire = (id) => {
    if (id in overrides) return overrides[id];
    if (id.startsWith('@/')) return load(`src/${id.slice(2)}.ts`, overrides);
    return require(id);
  };
  new Function('exports', 'require', 'module', output)(mod.exports, localRequire, mod);
  return mod.exports;
}

const { analyzeMessage, JevError } = load('src/lib/jev.ts');
const { deriveConcernLevel } = load('src/lib/concern-level.ts');
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
after(() => {
  global.fetch = originalFetch;
  for (const key of ['JEV_API_KEY', 'JEV_API_URL', 'JEV_MODEL', 'OPENAI_API_KEY']) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

function configure() {
  process.env.JEV_API_KEY = 'test-secret';
  delete process.env.JEV_API_URL;
  delete process.env.JEV_MODEL;
}

function response() {
  const answers = {
    scam_category: { type: 'choice', choice: 'unknown', confidence: 0.8 },
    risk_score: { type: 'score', score: 2.77, confidence: 0.83 },
  };
  for (const key of ['scam_likelihood', 'urgency_flag', 'financial_request', 'sensitive_information', 'impersonation', 'suspicious_link', 'threat', 'reward', 'payment_change']) {
    answers[key] = { type: 'noul', noul: 0.1 };
  }
  return { answers };
}

test('sends Postman primary questions and preserves weighted 0-4 score', async () => {
  configure();
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'jev-latest');
    assert.equal(body.state, 'Example message');
    assert.equal(body.questions.risk_score.criteria.length, 5);
    assert.deepEqual(Object.keys(body.questions.scam_category.criteria), ['phishing', 'financial_fraud', 'impersonation', 'prize_scam', 'delivery_scam', 'job_scam', 'investment_scam', 'marketplace_scam', 'account_threat', 'legitimate', 'unknown']);
    assert.equal(body.questions.urgency_flag.type, 'noul');
    return Response.json(response());
  };
  const result = await analyzeMessage('Example message');
  assert.equal(result.category, 'unknown');
  assert.equal(result.riskScore, 2.77);
  assert.equal(result.urgency, false);
  assert.equal(result.scamProbability, 0.1);
  assert.equal(result.confidence, 0.83);
  assert.equal(result.urgencyProbability, 0.1);
});

test('rejects missing, nonnumeric, and out-of-range answers', async () => {
  configure();
  for (const mutate of [
    data => delete data.answers,
    data => delete data.answers.urgency_flag,
    data => data.answers.risk_score.score = '3',
    data => data.answers.risk_score.score = 5,
    data => data.answers.urgency_flag.noul = -1,
    data => data.answers.scam_category.choice = 'invented',
    data => delete data.answers.scam_likelihood,
    data => data.answers.scam_likelihood.noul = 1.2,
    data => data.answers.risk_score.confidence = '0.8',
    data => data.answers.risk_score.confidence = -0.1,
  ]) {
    const data = response();
    mutate(data);
    global.fetch = async () => Response.json(data);
    await assert.rejects(analyzeMessage('Example'), JevError);
  }
});

test('HTTP failures identify the cause without exposing response bodies', async () => {
  configure();
  for (const status of [400, 401, 403, 404, 422, 500]) {
    global.fetch = async () => new Response('test-secret private message', { status });
    await assert.rejects(analyzeMessage('Example'), error => {
      assert.ok(error instanceof JevError);
      assert.match(error.message, new RegExp(String(status)));
      assert.ok(!error.message.includes('test-secret'));
      assert.equal(error.status, 502);
      return true;
    });
  }
});

test('retries transient rate limiting and recovers', async () => {
  configure();
  let calls = 0;
  global.fetch = async () => ++calls === 1 ? new Response('', { status: 429 }) : Response.json(response());
  await analyzeMessage('Example');
  assert.equal(calls, 2);
});

test('stops retrying an overloaded service', async () => {
  configure();
  let calls = 0;
  global.fetch = async () => { calls++; return new Response('', { status: 529 }); };
  await assert.rejects(analyzeMessage('Example'), error => error.status === 503);
  assert.equal(calls, 3);
});

test('handles timeout, network failure, and invalid JSON', async () => {
  configure();
  global.fetch = async () => { throw new DOMException('Timeout', 'TimeoutError'); };
  await assert.rejects(analyzeMessage('Example'), error => error.status === 504);
  global.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(analyzeMessage('Example'), /Could not connect/);
  global.fetch = async () => new Response('<html>not JSON</html>');
  await assert.rejects(analyzeMessage('Example'), /invalid JSON/);
});

test('rejects partial configuration instead of silently using demo analysis', async () => {
  configure();
  delete process.env.JEV_API_KEY;
  process.env.JEV_MODEL = 'jev-latest';
  await assert.rejects(analyzeMessage('Example'), /JEV_API_KEY is missing/);
  configure();
  process.env.JEV_API_URL = 'not a URL';
  await assert.rejects(analyzeMessage('Example'), /valid HTTP/);
});

test('unconfigured demo mode remains available', async () => {
  for (const key of ['JEV_API_KEY', 'JEV_API_URL', 'JEV_MODEL']) delete process.env[key];
  global.fetch = async () => { throw new Error('must not fetch'); };
  assert.equal(deriveConcernLevel(await analyzeMessage('Hello friend')), 'low');
});

test('concern levels combine probability and supporting signals', async () => {
  configure();
  global.fetch = async () => Response.json(response());
  const result = await analyzeMessage('Example');
  assert.equal(deriveConcernLevel(result), 'low');
  assert.equal(deriveConcernLevel({ ...result, scamProbability: 0.5 }), 'needs_verification');
  assert.equal(deriveConcernLevel({ ...result, sensitiveInformationProbability: 0.9, suspiciousLinkProbability: 0.9 }), 'high');
});

test('API validates input, reports JEV failures, and returns successful analysis', async () => {
  configure();
  const explanation = { summary: 'Example', warningSigns: [], recommendedActions: [] };
  const { POST } = load('src/app/api/analyze/route.ts', {
    '@/lib/jev': { analyzeMessage, JevError },
    '@/lib/openai': { explainResult: async () => explanation },
  });
  const request = body => new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify(body) });
  for (const body of [null, { model: 'jev-latest', state: 'Example' }, { mode: 'text', text: 123 }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  global.fetch = async () => new Response('private', { status: 401 });
  const failed = await POST(request({ mode: 'text', text: 'Example message' }));
  assert.equal(failed.status, 502);
  assert.match((await failed.json()).message, /authentication failed/);
  global.fetch = async () => Response.json(response());
  const success = await POST(request({ mode: 'text', text: 'Example message' }));
  assert.equal(success.status, 200);
  const result = await success.json();
  assert.equal(result.riskScore, 2.77);
  assert.equal(result.concernLevel, 'low');
});

test('POST handles screenshots, extraction failures, fallback explanations, and malformed requests', async () => {
  configure();
  process.env.OPENAI_API_KEY = 'test-image-key';
  global.fetch = async () => Response.json(response());
  let extractionCalls = 0;
  let readable = true;
  const explanation = { summary: 'Fallback', warningSigns: [], recommendedActions: [] };
  const { POST } = load('src/app/api/analyze/route.ts', {
    '@/lib/jev': { analyzeMessage, JevError },
    '@/lib/openai': {
      extractTextFromImage: async (image, mime) => {
        extractionCalls++;
        assert.equal(image, 'aGVsbG8=');
        assert.equal(mime, 'image/png');
        return { extractedText: 'Example screenshot message', readability: readable ? 'clear' : 'unclear' };
      },
      explainResult: async () => { throw new Error('Provider unavailable'); },
      fallbackExplanation: () => explanation,
    },
  });
  assert.equal(typeof POST, 'function', 'The route must export a POST handler');
  const request = body => new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify(body) });
  const image = { mode: 'image', imageBase64: 'aGVsbG8=', mimeType: 'image/png' };
  const success = await POST(request(image));
  assert.equal(success.status, 200);
  const result = await success.json();
  assert.equal(result.extractedText, 'Example screenshot message');
  assert.equal(result.usedFallbackExplanation, true);
  assert.deepEqual(result.explanation, explanation);
  readable = false;
  assert.equal((await POST(request(image))).status, 400);
  const calls = extractionCalls;
  for (const body of [{ ...image, mimeType: 'text/html' }, { ...image, imageBase64: 'bad!' }, { ...image, imageBase64: '' }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  assert.equal((await POST(request({ ...image, imageBase64: 'A'.repeat(4 * 1024 * 1024 + 4) }))).status, 413);
  assert.equal(extractionCalls, calls);
  delete process.env.OPENAI_API_KEY;
  assert.equal((await POST(request(image))).status, 503);
  assert.equal((await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: '{' }))).status, 400);
});
