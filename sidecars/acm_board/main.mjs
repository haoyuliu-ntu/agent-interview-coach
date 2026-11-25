import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const PROBLEM_FILE = path.join(PLUGIN_ROOT, 'current-problem.json');
const DRAFT_FILE = path.join(PLUGIN_ROOT, 'current-draft.json');
const NO_STORE = { 'Cache-Control': 'no-store' };
const RUN_TIMEOUT_MS = 5000;

const DEFAULT_PROBLEM = {
  id: 'demo-lru-or-subarray',
  title: '等待面试官下发题目（示例：和为 K 的子数组）',
  difficulty: 'Medium',
  category: '前缀和 + 哈希表 · ACM 模式',
  timeLimitMin: 20,
  statement:
    '给你一个整数数组 nums 和一个整数 k，请你统计并返回该数组中和为 k 的连续子数组的个数。\n\n子数组是数组中元素的连续非空序列。\n\n（当前为默认练习样例；当面试官在模拟面试中进入“阶段 4 · ACM 手撕”时，会自动把新题目同步到这里。）',
  inputFormat: '第一行包含两个整数 n 和 k（用空格分隔）。\n第二行包含 n 个整数，表示数组 nums（用空格分隔）。',
  outputFormat: '输出一个整数，表示和为 k 的连续子数组个数。',
  constraints: '1 <= n <= 2 * 10^4\n-1000 <= nums[i] <= 1000\n-10^7 <= k <= 10^7',
  samples: [
    {
      input: '3 2\n1 1 1',
      output: '2',
      explanation: '子数组 [1, 1]（下标 0..1）与 [1, 1]（下标 1..2）的和均为 2。',
    },
    {
      input: '3 3\n1 2 3',
      output: '2',
      explanation: '子数组 [1, 2] 与 [3] 的和均为 3。',
    },
  ],
  updatedAt: new Date().toISOString(),
};

async function loadSidecarSdk() {
  try {
    return await import('sidecar_sdk');
  } catch {}
  const candidates = [
    path.join(os.homedir(), '.gemini', 'config', 'node_modules', 'sidecar_sdk', 'index.mjs'),
    path.join(os.homedir(), '.gemini', 'antigravity', 'lib', 'node_modules', 'sidecar_sdk', 'index.mjs'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return await import(pathToFileURL(p).href);
      } catch {}
    }
  }
  return null;
}

function readJsonSafe(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {}
  return fallback;
}

function findPythonExe() {
  const cached = path.join(
    os.homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'python',
    process.platform === 'win32' ? 'python.exe' : 'python3'
  );
  const candidates = [
    process.env.PYTHON_EXE,
    'python',
    'python3',
    cached,
  ].filter(Boolean);
  for (const c of candidates) {
    if (path.isAbsolute(c)) {
      if (fs.existsSync(c)) return c;
    } else {
      return c;
    }
  }
  return 'python';
}

function execCodeProcess(cmd, args, stdinText, timeoutMs = RUN_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;
    const child = execFile(
      cmd,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        if (settled) return;
        settled = true;
        const durationMs = Date.now() - start;
        const timedOut = Boolean(err && (err.killed || err.signal === 'SIGTERM' || /timed out/i.test(String(err.message || ''))));
        const exitCode = typeof err?.code === 'number' ? err.code : err ? 1 : 0;
        resolve({
          ok: !err,
          timedOut,
          exitCode,
          durationMs,
          stdout: String(stdout || ''),
          stderr: String(stderr || (err && !stderr ? err.message : '')),
        });
      }
    );
    try {
      if (child.stdin) {
        child.stdin.write(String(stdinText ?? ''));
        child.stdin.end();
      }
    } catch {}
  });
}

async function runCode({ language = 'python', code = '', stdin = '' } = {}) {
  let src = String(code || '');
  const fenced = src.trim().match(/^```[a-zA-Z0-9_+-]*\r?\n([\s\S]*?)\r?\n```\s*$/);
  if (fenced) src = fenced[1];
  if (!src.trim()) {
    return { ok: false, unsupported: false, error: '代码为空，请先写下你的解法。' };
  }

  const lang = String(language || 'python').toLowerCase();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-acm-'));

  try {
    if (lang === 'python' || lang === 'python3' || lang === 'py') {
      const file = path.join(tmpDir, 'solution.py');
      fs.writeFileSync(file, src, 'utf8');
      const pyCandidates = [];
      const cached = path.join(
        os.homedir(),
        '.cache',
        'codex-runtimes',
        'codex-primary-runtime',
        'dependencies',
        'python',
        process.platform === 'win32' ? 'python.exe' : 'python3'
      );
      pyCandidates.push(['python', [file]]);
      if (process.platform === 'win32') pyCandidates.push(['py', ['-3', file]]);
      else pyCandidates.push(['python3', [file]]);
      if (fs.existsSync(cached)) pyCandidates.push([cached, [file]]);

      let lastRes = null;
      for (const [cmd, args] of pyCandidates) {
        const res = await execCodeProcess(cmd, args, stdin);
        if (res.stderr && /ENOENT|not recognized|无法将|找不到/i.test(res.stderr)) {
          lastRes = res;
          continue;
        }
        return { ...res, runner: cmd };
      }
      return lastRes || { ok: false, unsupported: true, error: '未找到可用的 Python 运行环境，你可以直接点击「提交给面试官评审」，AI 会人工走查你的思路与代码。' };
    }

    if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      const file = path.join(tmpDir, 'solution.js');
      fs.writeFileSync(file, src, 'utf8');
      const res = await execCodeProcess(process.execPath, [file], stdin);
      return { ...res, runner: 'node' };
    }

    if (lang === 'cpp' || lang === 'c++') {
      const srcFile = path.join(tmpDir, 'solution.cpp');
      const exeFile = path.join(tmpDir, process.platform === 'win32' ? 'solution.exe' : 'solution');
      fs.writeFileSync(srcFile, src, 'utf8');
      const comp = await execCodeProcess('g++', ['-O2', '-std=c++17', srcFile, '-o', exeFile], '', 10000);
      if (!comp.ok) {
        if (/ENOENT|not recognized/i.test(comp.stderr)) {
          return { ok: false, unsupported: true, error: '本机未检测到 g++ 编译器；无需担心，直接点击「提交给面试官评审」，AI 会直接评审你的算法思路和 C++ 实现。' };
        }
        return { ...comp, compileError: true, runner: 'g++' };
      }
      const res = await execCodeProcess(exeFile, [], stdin);
      return { ...res, runner: 'g++' };
    }

    return {
      ok: false,
      unsupported: true,
      error: `当前白板暂未配置 ${language} 本地编译器；可直接点击「提交给面试官评审」，AI 会完整审阅你的思路、复杂度与代码细节。`,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

function handleGetProblem() {
  const prob = readJsonSafe(PROBLEM_FILE, DEFAULT_PROBLEM);
  const draft = readJsonSafe(DRAFT_FILE, null);
  return { ok: true, problem: prob, draft };
}

function handleSaveDraft(data) {
  try {
    const payload = {
      problemId: String(data?.problemId || ''),
      language: String(data?.language || 'python'),
      code: String(data?.code || ''),
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DRAFT_FILE, JSON.stringify(payload, null, 2), 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

function findBrowserAppExe() {
  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    return candidates.find((p) => fs.existsSync(p)) || null;
  }
  return null;
}

function handlePopout(data, port) {
  try {
    const prob = readJsonSafe(PROBLEM_FILE, DEFAULT_PROBLEM);
    const convId = String(data?.conversationId || prob?.conversationId || process.env.ANTIGRAVITY_CONVERSATION_ID || '');
    const token = String(process.env.ANTIGRAVITY_SIDECAR_UI_TOKEN || '');
    const qs = new URLSearchParams();
    if (token) qs.set('token', token);
    if (convId) qs.set('conversationId', convId);
    qs.set('popout', '1');
    const url = `http://127.0.0.1:${port}/?${qs.toString()}`;

    const width = Math.max(980, Math.min(1440, Number(data?.width) || 1280));
    const height = Math.max(680, Math.min(960, Number(data?.height) || 820));
    const screenW = Number(data?.screenWidth) || 1920;
    const screenH = Number(data?.screenHeight) || 1080;
    const left = Math.max(40, Math.round((screenW - width) / 2));
    const top = Math.max(30, Math.round((screenH - height) / 2));

    const browserExe = findBrowserAppExe();
    if (browserExe) {
      const child = spawn(
        browserExe,
        [`--app=${url}`, `--window-size=${width},${height}`, `--window-position=${left},${top}`],
        { detached: true, stdio: 'ignore', windowsHide: false }
      );
      child.unref();
      return { ok: true, mode: 'app-window', url };
    }

    if (process.platform === 'win32') {
      const child = spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      return { ok: true, mode: 'browser', url };
    }
    return { ok: false, error: '当前系统未检测到可用的独立窗口浏览器', url };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

const STATIC_FILES = {
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
};

const sdk = await loadSidecarSdk();
const isSidecarEnv = Boolean(
  sdk?.SidecarApp &&
    process.env.ANTIGRAVITY_LS_ADDRESS &&
    process.env.ANTIGRAVITY_CSRF_TOKEN &&
    process.env.ANTIGRAVITY_SIDECAR_WEB_PORT
);

if (isSidecarEnv) {
  const { SidecarApp, Response } = sdk;
  const app = new SidecarApp();

  app.page(
    '/',
    () =>
      new Response(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), {
        contentType: 'text/html; charset=utf-8',
        headers: NO_STORE,
      })
  );

  for (const [route, [file, contentType]] of Object.entries(STATIC_FILES)) {
    app.api(
      route,
      () =>
        new Response(fs.readFileSync(path.join(__dirname, file), 'utf8'), {
          contentType,
          headers: NO_STORE,
        }),
      'GET'
    );
  }

  const sidecarPort = parseInt(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT || '8776', 10);
  app.api('/api/problem', () => handleGetProblem(), 'GET');
  app.api('/api/run', async (data) => runCode(data), 'POST');
  app.api('/api/save-draft', (data) => handleSaveDraft(data), 'POST');
  app.api('/api/popout', (data) => handlePopout(data, sidecarPort), 'POST');

  app.run();
} else {
  const port = parseInt(process.env.PORT || '8776', 10);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE });
      res.end(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
      return;
    }
    if (url.pathname === '/preload.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', ...NO_STORE });
      res.end('window.sidecar = window.sidecar || {};');
      return;
    }
    if (STATIC_FILES[url.pathname]) {
      const [file, ct] = STATIC_FILES[url.pathname];
      res.writeHead(200, { 'Content-Type': ct, ...NO_STORE });
      res.end(fs.readFileSync(path.join(__dirname, file), 'utf8'));
      return;
    }
    if (url.pathname === '/api/problem') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE });
      res.end(JSON.stringify(handleGetProblem()));
      return;
    }
    if (req.method === 'POST' && (url.pathname === '/api/run' || url.pathname === '/api/save-draft' || url.pathname === '/api/popout')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const out =
            url.pathname === '/api/run'
              ? await runCode(parsed)
              : url.pathname === '/api/popout'
                ? handlePopout(parsed, port)
                : handleSaveDraft(parsed);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE });
          res.end(JSON.stringify(out));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`ACM Whiteboard standalone server listening on http://127.0.0.1:${port}`);
  });
}
