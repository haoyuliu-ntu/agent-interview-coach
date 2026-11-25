(() => {
  const $ = (id) => document.getElementById(id);

  const ACM_TEMPLATES = {
    python: `import sys\n\ndef solve():\n    data = sys.stdin.read().strip().split()\n    if not data:\n        return\n    # 在这里解析输入并实现你的解法\n    \n\nif __name__ == "__main__":\n    solve()\n`,
    javascript: `const fs = require('fs');\n\nfunction solve() {\n  const input = fs.readFileSync(0, 'utf8').trim();\n  if (!input) return;\n  const tokens = input.split(/\\s+/);\n  // 在这里解析输入并实现你的解法\n  \n}\n\nsolve();\n`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // 在这里解析输入并实现你的解法\n    \n    return 0;\n}\n`,
    java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // 在这里解析输入并实现你的解法\n        \n    }\n}\n`,
  };

  const state = {
    problem: null,
    language: 'python',
    lastRunResult: null,
    remainingSec: 20 * 60,
    timerRunning: true,
    timerId: null,
    saveTimer: null,
    activeTab: 'acm',
  };

  function switchTab(tab) {
    const next = tab === 'dashboard' ? 'dashboard' : 'acm';
    state.activeTab = next;
    const isDash = next === 'dashboard';
    $('tab-acm')?.classList.toggle('active', !isDash);
    $('tab-dashboard')?.classList.toggle('active', isDash);
    $('acm-main')?.classList.toggle('hidden', isDash);
    $('acm-footer')?.classList.toggle('hidden', isDash);
    $('dashboard-view')?.classList.toggle('hidden', !isDash);
    $('timer-pill')?.classList.toggle('hidden', isDash);
    $('btn-reload')?.classList.toggle('hidden', isDash);
    $('btn-dash-refresh')?.classList.toggle('hidden', !isDash);
    if (isDash) {
      window.InterviewDashboard?.refresh?.();
    }
  }

  function apiFetch(url, options = {}) {
    const f = window.sidecar?.fetch ? window.sidecar.fetch.bind(window.sidecar) : fetch;
    return f(url, options);
  }

  function setStatus(msg, level = '') {
    const el = $('status-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = `status-msg${level ? ' ' + level : ''}`;
  }

  function updateLineNumbers() {
    const ed = $('code-editor');
    const ln = $('line-nums');
    if (!ed || !ln) return;
    const count = Math.max(1, ed.value.split('\n').length);
    const arr = [];
    for (let i = 1; i <= count; i++) arr.push(String(i));
    ln.textContent = arr.join('\n');
    ln.scrollTop = ed.scrollTop;
  }

  function renderTimer() {
    const pill = $('timer-pill');
    if (!pill) return;
    const abs = Math.abs(state.remainingSec);
    const m = String(Math.floor(abs / 60)).padStart(2, '0');
    const s = String(abs % 60).padStart(2, '0');
    pill.textContent = (state.remainingSec < 0 ? '-' : '') + `${m}:${s}` + (state.timerRunning ? '' : ' ⏸');
    pill.classList.toggle('warn', state.remainingSec <= 300 && state.remainingSec > 0);
    pill.classList.toggle('over', state.remainingSec <= 0);
  }

  function startTimer() {
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      if (!state.timerRunning) return;
      state.remainingSec -= 1;
      renderTimer();
    }, 1000);
    renderTimer();
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderProblem(prob) {
    state.problem = prob;
    $('prob-title').textContent = prob.title || 'ACM 手撕编程题';
    const diff = String(prob.difficulty || 'Medium');
    const diffEl = $('prob-diff');
    diffEl.textContent = diff;
    diffEl.className = `badge ${diff.toLowerCase()}`;
    $('prob-cat').textContent = prob.category ? `题目描述 · ${prob.category}` : 'ACM 题目描述';
    $('prob-statement').textContent = prob.statement || '';
    $('prob-input').textContent = prob.inputFormat || '';
    $('prob-output').textContent = prob.outputFormat || '';
    $('prob-constraints').textContent = prob.constraints || '见题目描述';

    const samples = Array.isArray(prob.samples) ? prob.samples : [];
    const box = $('prob-samples');
    box.innerHTML = samples
      .map(
        (sp, i) => `
      <div class="sample-box">
        <div class="sample-head">
          <span>样例 ${i + 1}</span>
          <button type="button" class="btn" data-use-sample="${i}" style="padding:1px 7px;font-size:10.5px">填入输入盒</button>
        </div>
        <div class="sample-grid">
          <div class="sample-col"><div>输入</div><pre>${esc(sp.input)}</pre></div>
          <div class="sample-col"><div>预期输出</div><pre>${esc(sp.output)}</pre></div>
        </div>
        ${sp.explanation ? `<div class="sample-exp">说明：${esc(sp.explanation)}</div>` : ''}
      </div>`
      )
      .join('');

    if (samples[0]?.input && !$('stdin-input').value.trim()) {
      $('stdin-input').value = samples[0].input;
    }
  }

  async function loadProblem(resetCodeIfNew = false) {
    try {
      const res = await apiFetch('/api/problem', { method: 'GET' });
      const data = await res.json();
      if (!data?.ok || !data.problem) return;
      const prevId = state.problem?.id;
      const nextProb = data.problem;
      renderProblem(nextProb);

      const isNewProblem = prevId && prevId !== nextProb.id;
      const draftMatches = Boolean(data.draft && data.draft.problemId === nextProb.id && String(data.draft.code || '').trim());
      const curEditorVal = $('code-editor').value.trim();
      const isBlankTemplate = !curEditorVal || curEditorVal === (ACM_TEMPLATES[state.language] || '').trim();

      if ((!prevId || (resetCodeIfNew && isNewProblem) || isBlankTemplate) && draftMatches) {
        state.language = data.draft.language || 'python';
        $('lang-select').value = state.language;
        $('code-editor').value = data.draft.code || ACM_TEMPLATES[state.language];
        if (nextProb.samples?.[0]?.input) $('stdin-input').value = nextProb.samples[0].input;
        if (!prevId || isNewProblem) {
          state.remainingSec = (Number(nextProb.timeLimitMin) || 20) * 60;
          state.timerRunning = true;
          renderTimer();
        }
      } else if (!prevId || (resetCodeIfNew && isNewProblem)) {
        $('code-editor').value = ACM_TEMPLATES[state.language] || ACM_TEMPLATES.python;
        if (nextProb.samples?.[0]?.input) $('stdin-input').value = nextProb.samples[0].input;
        state.remainingSec = (Number(nextProb.timeLimitMin) || 20) * 60;
        state.timerRunning = true;
        renderTimer();
      }
      updateLineNumbers();
      setStatus(isNewProblem ? `已同步新题：${nextProb.title}` : '题目已同步就绪');
    } catch (e) {
      setStatus(`同步题目失败: ${e.message}`, 'err');
    }
  }

  function scheduleSaveDraft() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      apiFetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: state.problem?.id || '',
          language: state.language,
          code: $('code-editor').value,
        }),
      }).catch(() => {});
    }, 500);
  }

  async function handleRun() {
    const btn = $('btn-run');
    const outEl = $('run-output');
    const metaEl = $('run-meta');
    btn.disabled = true;
    outEl.className = 'out-box';
    outEl.textContent = '正在本地运行中…';
    setStatus('正在本地执行你的 ACM 代码…');

    try {
      const res = await apiFetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: state.language,
          code: $('code-editor').value,
          stdin: $('stdin-input').value,
        }),
      });
      const data = await res.json();
      state.lastRunResult = { ...data, stdin: $('stdin-input').value };

      if (data.unsupported) {
        outEl.className = 'out-box';
        outEl.textContent = data.error || '本机暂无该语言运行器，可直接提交给面试官评审。';
        metaEl.textContent = '未运行（可直接提交评审）';
        setStatus('本机无对应编译器，直接点提交即可由 AI 评审思路与代码');
      } else if (data.timedOut) {
        outEl.className = 'out-box err';
        outEl.textContent = '⏱ 运行超时（> 5s），可能存在死循环或时间复杂度过高。';
        metaEl.textContent = 'TLE · >5000ms';
        setStatus('运行超时，可检查循环或直接提交让面试官帮看', 'err');
      } else if (data.ok) {
        outEl.className = 'out-box ok';
        outEl.textContent = data.stdout || '(程序正常退出，无标准输出)';
        metaEl.textContent = `退出码 0 · ${data.durationMs ?? 0}ms (${data.runner || ''})`;
        setStatus('本地试运行完成', 'good');
      } else {
        outEl.className = 'out-box err';
        const parts = [];
        if (data.stdout) parts.push(`[stdout]\n${data.stdout}`);
        if (data.stderr || data.error) parts.push(`[stderr]\n${data.stderr || data.error}`);
        outEl.textContent = parts.join('\n\n') || '运行出错';
        metaEl.textContent = `${data.compileError ? '编译错误' : '运行错误'} · 退出码 ${data.exitCode ?? 1}`;
        setStatus('代码运行有报错（若思路已完成也可直接提交让面试官评审）', 'err');
      }
    } catch (e) {
      outEl.className = 'out-box err';
      outEl.textContent = `试运行请求异常：${e.message}`;
      setStatus('本地试运行异常', 'err');
    } finally {
      btn.disabled = false;
    }
  }

  async function handleSubmit() {
    const code = $('code-editor').value.trim();
    if (!code) {
      setStatus('请先写下你的代码再提交', 'err');
      return;
    }
    const probTitle = state.problem?.title || '当前 ACM 题目';
    const langTag = state.language === 'cpp' ? 'cpp' : state.language === 'javascript' ? 'javascript' : state.language === 'java' ? 'java' : 'python';
    const runSummary = state.lastRunResult
      ? (state.lastRunResult.ok
          ? `本地试运行通过（耗时 ${state.lastRunResult.durationMs}ms），输出：\n\`\`\`text\n${(state.lastRunResult.stdout || '').trim().slice(0, 600)}\n\`\`\``
          : `本地试运行未通过（${state.lastRunResult.timedOut ? '超时' : state.lastRunResult.unsupported ? '无本机编译器' : '报错'}）：\n\`\`\`text\n${(state.lastRunResult.stderr || state.lastRunResult.error || '').trim().slice(0, 600)}\n\`\`\``)
      : '（尚未本地试运行，直接提交）';

    const message = [
      `【ACM 白板提交】题目：${probTitle}（语言：${state.language}）`,
      `\n**我的 ACM 完整代码：**\n\`\`\`${langTag}\n${code}\n\`\`\``,
      `\n**自测情况：**\n${runSummary}`,
      `\n请作为面试官直接阅读我的代码来判断我的书写思路、复杂度与实现是否正确：即使代码因为小错误运行不了，只要代码体现的核心思路是对的请先给予肯定，再精准指出 Bug 与修改建议。`,
    ]
      .filter(Boolean)
      .join('\n');

    const btn = $('btn-submit');
    btn.disabled = true;
    setStatus('正在提交给当前对话的面试官…');

    try {
      const targetConvId = window.sidecar?.conversationId || state.problem?.conversationId || '';
      if (window.sidecar?.agent?.sendMessage && targetConvId) {
        await window.sidecar.agent.sendMessage(message, targetConvId);
        state.timerRunning = false;
        renderTimer();
        const isPopout = new URLSearchParams(location.search).get('popout') === '1';
        if (isPopout) {
          setStatus('✅ 已提交回 Antigravity 面试对话！可切回主窗口查看点评', 'good');
        } else {
          setStatus('✅ 已提交给面试官！正在切回对话查看实时评审…', 'good');
          if (window.sidecar?.ui?.toggleConversation) {
            setTimeout(() => {
              try { window.sidecar.ui.toggleConversation(targetConvId); } catch {}
            }, 450);
          }
        }
      } else {
        await navigator.clipboard.writeText(message);
        setStatus('已复制提交内容到剪贴板，请直接粘贴发送到面试对话', 'good');
      }
    } catch (e) {
      try {
        await navigator.clipboard.writeText(message);
        setStatus(`自动发送受限（${e.message}），已自动复制到剪贴板，直接粘贴发回对话即可`, 'good');
      } catch {
        setStatus(`提交失败: ${e.message}`, 'err');
      }
    } finally {
      btn.disabled = false;
    }
  }

  // Events
  $('code-editor').addEventListener('input', () => {
    updateLineNumbers();
    scheduleSaveDraft();
  });
  $('code-editor').addEventListener('scroll', () => {
    $('line-nums').scrollTop = $('code-editor').scrollTop;
  });
  $('code-editor').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ed = $('code-editor');
      const start = ed.selectionStart;
      const end = ed.selectionEnd;
      ed.value = ed.value.slice(0, start) + '    ' + ed.value.slice(end);
      ed.selectionStart = ed.selectionEnd = start + 4;
      updateLineNumbers();
      scheduleSaveDraft();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  });

  $('lang-select').addEventListener('change', (e) => {
    const prevLang = state.language;
    const nextLang = e.target.value;
    state.language = nextLang;
    const curCode = $('code-editor').value.trim();
    const prevTpl = (ACM_TEMPLATES[prevLang] || '').trim();
    if (!curCode || curCode === prevTpl) {
      $('code-editor').value = ACM_TEMPLATES[nextLang] || '';
      updateLineNumbers();
    }
    scheduleSaveDraft();
  });

  $('btn-template').addEventListener('click', () => {
    $('code-editor').value = ACM_TEMPLATES[state.language] || '';
    updateLineNumbers();
    scheduleSaveDraft();
    setStatus('已重置为干净的 ACM 模板');
  });

  $('btn-toggle-prob').addEventListener('click', () => {
    const panel = $('prob-panel');
    const collapsed = panel.classList.toggle('collapsed');
    $('btn-toggle-prob').textContent = collapsed ? '展开题面' : '收起题面';
  });

  $('prob-samples').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-use-sample]');
    if (!btn) return;
    const idx = Number(btn.dataset.useSample);
    const sp = state.problem?.samples?.[idx];
    if (sp) {
      $('stdin-input').value = sp.input || '';
      setStatus(`已将样例 ${idx + 1} 填入输入盒`);
    }
  });

  $('timer-pill').addEventListener('click', () => {
    state.timerRunning = !state.timerRunning;
    renderTimer();
  });
  $('timer-pill').addEventListener('dblclick', () => {
    state.remainingSec = (Number(state.problem?.timeLimitMin) || 20) * 60;
    state.timerRunning = true;
    renderTimer();
  });

  const popoutBtn = $('btn-popout');
  if (popoutBtn) {
    if (new URLSearchParams(location.search).get('popout') === '1') {
      popoutBtn.style.display = 'none';
    } else {
      popoutBtn.addEventListener('click', async () => {
        try {
          popoutBtn.disabled = true;
          const convId = window.sidecar?.conversationId || state.problem?.conversationId || '';
          const res = await apiFetch('/api/popout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: convId,
              tab: state.activeTab,
              workspace: window.InterviewDashboard?.getWorkspace?.() || '',
              screenWidth: window.screen?.availWidth || 1920,
              screenHeight: window.screen?.availHeight || 1080,
            }),
          });
          const data = await res.json();
          if (data?.ok) {
            setStatus('✅ 已在屏幕正中央弹出独立双栏大窗口！', 'good');
          } else {
            setStatus(`弹出失败：${data?.error || '未知错误'}`, 'err');
          }
        } catch (e) {
          setStatus(`弹出失败：${e.message}`, 'err');
        } finally {
          popoutBtn.disabled = false;
        }
      });
    }
  }

  $('tab-acm')?.addEventListener('click', () => switchTab('acm'));
  $('tab-dashboard')?.addEventListener('click', () => switchTab('dashboard'));
  $('btn-reload').addEventListener('click', () => loadProblem(true));
  $('btn-run').addEventListener('click', handleRun);
  $('btn-submit').addEventListener('click', handleSubmit);

  // Auto-poll problem updates lightly so when AI pushes a new problem, board updates smoothly
  setInterval(() => {
    if (!document.hidden) loadProblem(true);
  }, 4000);

  loadProblem(false);
  startTimer();
  window.InterviewDashboard?.init?.();
  if (new URLSearchParams(location.search).get('tab') === 'dashboard') {
    switchTab('dashboard');
  }
})();
