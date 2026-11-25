(() => {
  const $ = (id) => document.getElementById(id);

  const DIM_META = [
    { key: 'codeMastery', label: '代码掌握度', short: '代码掌握' },
    { key: 'techSelection', label: '技术选型闭环', short: '选型闭环' },
    { key: 'engineeringResilience', label: '异常与工程思维', short: '工程兜底' },
    { key: 'algorithmAndEval', label: '算法与 Eval 意识', short: '算法Eval' },
    { key: 'acmCoding', label: 'ACM 手撕质量', short: 'ACM手撕' },
    { key: 'deliveryAndQuestions', label: '表达与反问质量', short: '表达结构' },
  ];

  const MODE_LABEL = {
    mock_full: '全真模拟',
    mock_drill: '专项加练',
    weakness_drill: '弱点5连击',
  };

  const STATUS_META = {
    open: { label: '未攻克', cls: 'miss' },
    partial: { label: '部分掌握', cls: 'warn' },
    mastered: { label: '已攻克', cls: 'hit' },
  };

  const state = {
    workspace: '',
    sessions: [],
    weakPoints: [],
    summary: null,
    selectedSessionIdx: -1,
    compareMode: 'prev',
    trendMetric: 'overall',
    weakFilter: 'all',
    initialized: false,
  };

  function apiFetch(url, options = {}) {
    const f = window.sidecar?.fetch ? window.sidecar.fetch.bind(window.sidecar) : fetch;
    return f(url, options);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function dimLabel(key) {
    return DIM_META.find((d) => d.key === key)?.label || key;
  }

  function formatSessionName(s, idx) {
    const date = String(s.timestamp || s.sessionId || '').slice(0, 10) || `#${idx + 1}`;
    const mode = MODE_LABEL[s.mode] || s.mode || '模考';
    const peak = s?.pressure?.peakLevel ? ` Lv.${s.pressure.peakLevel}` : '';
    const score = typeof s.overallScore === 'number' ? ` (${s.overallScore.toFixed(2)})` : '';
    return `${date} · ${mode}${peak}${score}`;
  }

  async function sendToConversation(message) {
    const targetConvId = window.sidecar?.conversationId || '';
    if (window.sidecar?.agent?.sendMessage && targetConvId) {
      await window.sidecar.agent.sendMessage(message, targetConvId);
      const isPopout = new URLSearchParams(location.search).get('popout') === '1';
      if (!isPopout && window.sidecar?.ui?.toggleConversation) {
        setTimeout(() => {
          try {
            window.sidecar.ui.toggleConversation(targetConvId);
          } catch {}
        }, 350);
      }
      return { sent: true };
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      return { sent: false, copied: true };
    }
    return { sent: false, copied: false };
  }

  function updateWeakBadge(summary) {
    const badge = $('weak-badge');
    if (!badge) return;
    const pending = (summary?.weakPointStats?.open || 0) + (summary?.weakPointStats?.partial || 0);
    badge.textContent = String(pending);
    badge.classList.toggle('hidden', pending <= 0);
  }

  function renderKpis(summary) {
    $('kpi-sessions').textContent = String(summary.totalSessions || 0);
    $('kpi-overall').textContent = summary.avgOverall !== null ? summary.avgOverall.toFixed(2) : '--';

    const deltaEl = $('kpi-delta');
    if (summary.overallDelta !== null) {
      const sign = summary.overallDelta > 0 ? '+' : '';
      deltaEl.textContent = `${sign}${summary.overallDelta.toFixed(2)} 较上次`;
      deltaEl.className = `delta-pill ${summary.overallDelta > 0 ? 'up' : summary.overallDelta < 0 ? 'down' : 'flat'}`;
      deltaEl.classList.remove('hidden');
    } else {
      deltaEl.classList.add('hidden');
    }

    $('kpi-keyword-rate').textContent =
      summary.avgKeywordHitRate !== null ? `${Math.round(summary.avgKeywordHitRate * 100)}%` : '--';

    const wp = summary.weakPointStats || { total: 0, open: 0, partial: 0, mastered: 0 };
    $('kpi-weak-progress').textContent = `${wp.mastered} / ${wp.total}`;
    $('kpi-weak-open').textContent = `${wp.open + wp.partial} 待攻克`;
  }

  function buildPolygonPoints(values, cx, cy, radius) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / 6;
      const v = typeof values[i] === 'number' ? Math.max(0, Math.min(5, values[i])) : 0;
      const r = (v / 5) * radius;
      pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    return pts;
  }

  function renderRadar() {
    const svg = $('radar-svg');
    const legend = $('radar-legend');
    const dimList = $('radar-dim-list');
    if (!svg) return;

    const sessions = state.sessions;
    if (!sessions.length) {
      svg.innerHTML = '<text x="180" y="140" text-anchor="middle" fill="#9ca3af" font-size="12">暂无评分数据</text>';
      legend.innerHTML = '';
      dimList.innerHTML = '';
      return;
    }

    const idx = Math.max(0, Math.min(sessions.length - 1, state.selectedSessionIdx));
    const curSession = sessions[idx];

    let compareScores = null;
    let compareLabel = '';
    if (state.compareMode === 'prev' && idx > 0) {
      compareScores = sessions[idx - 1].scores || {};
      compareLabel = '上一场';
    } else if (state.compareMode === 'avg' && state.summary?.dimensionAverages) {
      compareScores = {};
      for (const d of DIM_META) {
        compareScores[d.key] = { score: state.summary.dimensionAverages[d.key] };
      }
      compareLabel = '历史均值';
    }

    const cx = 180;
    const cy = 140;
    const radius = 92;
    const parts = [];

    // Concentric hexagon grid (1..5)
    for (let level = 1; level <= 5; level++) {
      const r = (level / 5) * radius;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
        pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
      }
      parts.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(255,255,255,${level === 5 ? 0.2 : 0.09})" stroke-width="1"/>`);
    }

    // Axes & vertex labels
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
      const x2 = cx + Math.cos(a) * radius;
      const y2 = cy + Math.sin(a) * radius;
      parts.push(`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`);

      const lx = cx + Math.cos(a) * (radius + 22);
      const ly = cy + Math.sin(a) * (radius + 18) + 4;
      const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
      parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" fill="#cbd5e1" font-size="11">${esc(DIM_META[i].short)}</text>`);
    }

    // Comparison polygon (dashed)
    if (compareScores) {
      const cmpVals = DIM_META.map((d) => compareScores?.[d.key]?.score);
      // Substitute nulls gently with 0 only for continuous path, mark real values
      const cmpPts = buildPolygonPoints(cmpVals.map((v) => (typeof v === 'number' ? v : 0)), cx, cy, radius);
      parts.push(
        `<polygon points="${cmpPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 3"/>`
      );
    }

    // Current session polygon (handle null acmCoding gracefully without pulling visual distortion via dashed skip indicator)
    const curVals = DIM_META.map((d) => curSession?.scores?.[d.key]?.score);
    const validForPoly = curVals.map((v) => (typeof v === 'number' ? v : 0));
    const curPts = buildPolygonPoints(validForPoly, cx, cy, radius);
    parts.push(
      `<polygon points="${curPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="rgba(129,140,248,0.28)" stroke="#818cf8" stroke-width="2"/>`
    );

    curPts.forEach((pt, i) => {
      const raw = curVals[i];
      if (typeof raw === 'number') {
        parts.push(`<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="3.8" fill="#a5b4fc" stroke="#111317" stroke-width="1.2"><title>${esc(DIM_META[i].label)}: ${raw}/5</title></circle>`);
      } else {
        // Draw hollow marker near origin if N/A (e.g. acmCoding null)
        parts.push(`<circle cx="${cx}" cy="${cy}" r="3" fill="none" stroke="#64748b" stroke-dasharray="2 2"><title>${esc(DIM_META[i].label)}: 本场未测 (N/A)</title></circle>`);
      }
    });

    svg.innerHTML = parts.join('');
    legend.innerHTML = `
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#818cf8;margin-right:4px"></span>当前选中场次</span>
      ${compareScores ? `<span><span style="display:inline-block;width:12px;height:2px;background:#fbbf24;margin-right:4px;vertical-align:middle"></span>${esc(compareLabel)}</span>` : ''}
    `;

    dimList.innerHTML = DIM_META.map((d) => {
      const item = curSession?.scores?.[d.key];
      const sc = typeof item?.score === 'number' ? item.score : null;
      const color = sc === null ? '#9ca3af' : sc >= 4 ? '#34d399' : sc >= 3 ? '#fbbf24' : '#f87171';
      return `<div class="dim-chip" title="${esc(item?.comment || '')}">
        <span style="color:#cbd5e1">${esc(d.short)}</span>
        <strong style="color:${color}">${sc !== null ? `${sc}/5` : 'N/A'}</strong>
      </div>`;
    }).join('');
  }

  function renderTrend() {
    const svg = $('trend-svg');
    const caption = $('trend-caption');
    if (!svg) return;

    const metric = state.trendMetric;
    const points = [];
    state.sessions.forEach((s, idx) => {
      const val = metric === 'overall' ? s.overallScore : s?.scores?.[metric]?.score;
      if (typeof val === 'number' && Number.isFinite(val)) {
        points.push({
          idx,
          val,
          label: String(s.timestamp || s.sessionId || '').slice(5, 10) || `#${idx + 1}`,
          mode: MODE_LABEL[s.mode] || s.mode || '',
          peak: s?.pressure?.peakLevel || 2,
        });
      }
    });

    if (!points.length) {
      svg.innerHTML = '<text x="210" y="120" text-anchor="middle" fill="#9ca3af" font-size="12">该维度暂无可绘制数据</text>';
      caption.textContent = '';
      return;
    }

    const w = 420;
    const h = 240;
    const padL = 34;
    const padR = 24;
    const padT = 24;
    const padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const parts = [];
    for (let yVal = 1; yVal <= 5; yVal++) {
      const y = padT + plotH - ((yVal - 1) / 4) * plotH;
      parts.push(`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`);
      parts.push(`<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#9ca3af" font-size="10.5">${yVal}</text>`);
    }

    const coords = points.map((p, i) => {
      const x = points.length === 1 ? padL + plotW / 2 : padL + (i / (points.length - 1)) * plotW;
      const clamped = Math.max(1, Math.min(5, p.val));
      const y = padT + plotH - ((clamped - 1) / 4) * plotH;
      return { ...p, x, y };
    });

    if (coords.length > 1) {
      const lineStr = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
      const areaStr = `${coords[0].x.toFixed(1)},${padT + plotH} ${lineStr} ${coords[coords.length - 1].x.toFixed(1)},${padT + plotH}`;
      parts.push(`<polygon points="${areaStr}" fill="rgba(52,211,153,0.12)"/>`);
      parts.push(`<polyline points="${lineStr}" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`);
    }

    coords.forEach((c) => {
      parts.push(`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4.5" fill="#34d399" stroke="#111317" stroke-width="1.5"><title>${esc(c.label)} · ${esc(c.mode)} · Lv.${c.peak} · ${c.val.toFixed(2)}分</title></circle>`);
      parts.push(`<text x="${c.x.toFixed(1)}" y="${(c.y - 9).toFixed(1)}" text-anchor="middle" fill="#f8fafc" font-size="10.5" font-weight="600">${c.val.toFixed(1)} (Lv.${c.peak})</text>`);
      parts.push(`<text x="${c.x.toFixed(1)}" y="${h - 10}" text-anchor="middle" fill="#9ca3af" font-size="10">${esc(c.label)}</text>`);
    });

    svg.innerHTML = parts.join('');
    const first = points[0].val;
    const last = points[points.length - 1].val;
    const diff = last - first;
    caption.textContent =
      points.length > 1
        ? `共 ${points.length} 场有效记录 · 首场 ${first.toFixed(2)} → 最新 ${last.toFixed(2)}（累计 ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}）`
        : `当前共 1 场记录（${last.toFixed(2)} 分），完成下一场后自动呈现折线趋势`;
  }

  function renderWeakestAndDelivery() {
    const summary = state.summary;
    const barsEl = $('weakest-bars');
    const weakest = summary?.weakestDimensions || [];

    barsEl.innerHTML = weakest.length
      ? weakest
          .map((item) => {
            const pct = Math.max(4, Math.min(100, (item.average / 5) * 100));
            const cls = item.average >= 4 ? 'good' : item.average >= 3 ? 'warn' : 'err';
            return `<div class="bar-row">
              <div class="bar-meta"><span>${esc(dimLabel(item.key))}</span><strong>${item.average.toFixed(2)} / 5</strong></div>
              <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct.toFixed(1)}%"></div></div>
            </div>`;
          })
          .join('')
      : '<div style="font-size:12px;color:var(--acm-muted)">暂无维度均值统计</div>';

    const cur = state.sessions[state.selectedSessionIdx];
    $('delivery-session-tag').textContent = cur ? formatSessionName(cur, state.selectedSessionIdx) : '--';

    const star = cur?.deliveryAudit?.starCheck;
    const starTags = $('star-tags');
    const starNote = $('star-note');
    if (star) {
      const items = [
        ['S 背景', star.situation],
        ['T 目标', star.task],
        ['A 动作', star.action],
        ['R 结果', star.result],
        ['个人贡献明确', star.individualContributionClear],
      ];
      starTags.innerHTML = items
        .map(([lbl, ok]) => `<span class="tag ${ok ? 'hit' : 'miss'}">${ok ? '✓' : '✗'} ${esc(lbl)}</span>`)
        .join('');
      starNote.textContent = star.note || '';
    } else {
      starTags.innerHTML = '<span class="tag">本场无 STAR 诊断记录</span>';
      starNote.textContent = '';
    }

    const kw = cur?.deliveryAudit?.keywords;
    const kwTags = $('keyword-tags');
    if (kw && (Array.isArray(kw.hit) || Array.isArray(kw.missed))) {
      const hitHtml = (kw.hit || []).map((k) => `<span class="tag hit">✓ ${esc(k)}</span>`).join('');
      const missHtml = (kw.missed || []).map((k) => `<span class="tag miss">✗ 漏: ${esc(k)}</span>`).join('');
      const rateStr = typeof kw.hitRate === 'number' ? `<span class="tag">命中率 ${Math.round(kw.hitRate * 100)}%</span>` : '';
      kwTags.innerHTML = rateStr + hitHtml + missHtml;
    } else {
      kwTags.innerHTML = '<span class="tag">本场无关键词命中统计</span>';
    }

    const vagueList = $('vague-list');
    const vagues = summary?.topVaguePhrases || [];
    vagueList.innerHTML = vagues.length
      ? vagues
          .slice(0, 5)
          .map(
            (v) => `<div class="vague-item">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <strong style="color:#fca5a5">「${esc(v.phrase)}」</strong>
            <span style="color:var(--acm-muted);font-size:11px">出现 ${v.count} 次</span>
          </div>
          ${v.suggestedReplacement ? `<div style="color:#a7f3d0;margin-top:3px">→ 建议替换：${esc(v.suggestedReplacement)}</div>` : ''}
        </div>`
          )
          .join('')
      : '<div style="font-size:12px;color:var(--acm-muted)">暂未检出高频模糊空话 👍</div>';

    const polished = cur?.deliveryAudit?.polishedAnswer60s;
    const polishedWrap = $('polished-wrap');
    const polishedText = $('polished-text');
    if (polished) {
      polishedWrap.classList.remove('hidden');
      polishedText.textContent = polished;
    } else {
      polishedWrap.classList.add('hidden');
    }
  }

  function renderWeakPoints() {
    const listEl = $('weak-list');
    if (!listEl) return;
    const filtered = state.weakPoints.filter((w) => state.weakFilter === 'all' || w.status === state.weakFilter);

    if (!filtered.length) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--acm-muted);padding:12px 0;text-align:center">当前筛选下暂无弱点记录</div>';
      return;
    }

    listEl.innerHTML = filtered
      .map((w) => {
        const st = STATUS_META[w.status] || STATUS_META.open;
        const sevCls = w.severity === 'high' ? 'miss' : w.severity === 'low' ? 'hit' : 'warn';
        const sevText = w.severity === 'high' ? '高危' : w.severity === 'low' ? '低' : '中';
        const dots = '●'.repeat(Math.max(0, Math.min(w.maxMastery, w.mastery))) + '○'.repeat(Math.max(0, w.maxMastery - w.mastery));
        const btnLabel = w.status === 'mastered' ? '🔁 复查巩固' : '🔥 发起 5 连击二刷';
        return `<div class="weak-card">
          <div class="weak-head">
            <div class="weak-title-row">
              <span class="weak-id">[${esc(w.id)}]</span>
              <span class="weak-title">${esc(w.title)}</span>
            </div>
            <div style="display:flex;gap:5px;align-items:center">
              <span class="tag ${sevCls}">${sevText}</span>
              <span class="tag ${st.cls}">${st.label}</span>
            </div>
          </div>
          ${w.description ? `<p class="weak-desc">${esc(w.description)}</p>` : ''}
          <div class="weak-meta">
            <span>维度：${esc(dimLabel(w.dimension))}</span>
            ${w.sourceRef ? `<span>源码：<code>${esc(w.sourceRef)}</code></span>` : ''}
            <span>最近二刷：${esc(w.lastDrilled || '未二刷')}</span>
          </div>
          <div class="weak-foot">
            <span class="mastery-dots ${w.status === 'mastered' ? 'done' : ''}" title="熟练度 ${w.mastery}/${w.maxMastery}">${dots} (${w.mastery}/${w.maxMastery})</span>
            <button type="button" class="btn btn-drill" data-drill-id="${esc(w.id)}">${btnLabel}</button>
          </div>
        </div>`;
      })
      .join('');
  }

  function renderAll() {
    const hasData = state.sessions.length > 0 || state.weakPoints.length > 0;
    $('dash-empty').classList.toggle('hidden', hasData);
    $('dash-content').classList.toggle('hidden', !hasData);
    updateWeakBadge(state.summary);
    if (!hasData) return;

    renderKpis(state.summary);

    const sel = $('radar-session-select');
    sel.innerHTML = state.sessions
      .map((s, i) => `<option value="${i}">${esc(formatSessionName(s, i))}</option>`)
      .reverse()
      .join('');
    if (state.sessions.length > 0) {
      if (state.selectedSessionIdx < 0 || state.selectedSessionIdx >= state.sessions.length) {
        state.selectedSessionIdx = state.sessions.length - 1;
      }
      sel.value = String(state.selectedSessionIdx);
    }

    renderRadar();
    renderTrend();
    renderWeakestAndDelivery();
    renderWeakPoints();
  }

  async function refresh(overrideWorkspace) {
    if (typeof overrideWorkspace === 'string') {
      state.workspace = overrideWorkspace.trim();
    }
    const qs = state.workspace ? `?workspace=${encodeURIComponent(state.workspace)}` : '';
    try {
      const res = await apiFetch(`/api/progress${qs}`, { method: 'GET' });
      const data = await res.json();
      if (!data?.ok) {
        $('dash-ws-label').textContent = data?.error || '读取看板数据失败';
        return;
      }
      if (data.workspace) {
        state.workspace = data.workspace;
        $('dash-ws-input').value = data.workspace;
        $('dash-ws-label').textContent = data.workspace;
      } else if (data.workspaceError) {
        $('dash-ws-label').textContent = data.workspaceError;
      } else {
        $('dash-ws-label').textContent = '未检测到活动工作区（可在右侧输入路径手动加载）';
      }
      $('dash-sync-time').textContent = `已同步 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;

      state.sessions = Array.isArray(data.sessions) ? data.sessions : [];
      state.weakPoints = Array.isArray(data.weakPoints) ? data.weakPoints : [];
      state.summary = data.summary || null;
      state.selectedSessionIdx = state.sessions.length - 1;
      renderAll();
    } catch (e) {
      $('dash-ws-label').textContent = `同步失败：${e.message}`;
    }
  }

  function bindEvents() {
    $('btn-ws-load')?.addEventListener('click', () => {
      refresh($('dash-ws-input').value);
    });
    $('dash-ws-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') refresh($('dash-ws-input').value);
    });
    $('btn-dash-refresh')?.addEventListener('click', () => refresh());

    $('radar-session-select')?.addEventListener('change', (e) => {
      state.selectedSessionIdx = Number(e.target.value);
      renderRadar();
      renderWeakestAndDelivery();
    });
    $('radar-compare-select')?.addEventListener('change', (e) => {
      state.compareMode = e.target.value;
      renderRadar();
    });
    $('trend-metric-select')?.addEventListener('change', (e) => {
      state.trendMetric = e.target.value;
      renderTrend();
    });

    $('btn-toggle-polished')?.addEventListener('click', () => {
      const box = $('polished-text');
      const hidden = box.classList.toggle('hidden');
      $('btn-toggle-polished').textContent = hidden ? '展开示范' : '收起示范';
    });

    $('weak-filters')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-status]');
      if (!btn) return;
      state.weakFilter = btn.dataset.status;
      document.querySelectorAll('#weak-filters .filter-pill').forEach((el) => {
        el.classList.toggle('active', el.dataset.status === state.weakFilter);
      });
      renderWeakPoints();
    });

    $('weak-list')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-drill-id]');
      if (!btn) return;
      const id = btn.dataset.drillId;
      const item = state.weakPoints.find((w) => w.id === id);
      if (!item) return;

      const msg = [
        `请使用 agent-interview-coach 进入【模式 C：弱点靶向 5 连击二刷】，锁定弱点 [${item.id}] ${item.title}。`,
        `归属维度：${dimLabel(item.dimension)}；当前状态：${item.status}（熟练度 ${item.mastery}/${item.maxMastery}）。`,
        item.sourceRef ? `关联源码：${item.sourceRef}。` : '',
        item.description ? `暴露问题：${item.description}` : '',
        `请先读取 evaluation-and-delivery.md，保持高压不剧透，直接向我发起第 1 击（底层机制还原）。`,
      ]
        .filter(Boolean)
        .join('\n');

      btn.disabled = true;
      try {
        const res = await sendToConversation(msg);
        btn.textContent = res.sent ? '✅ 已发往面试官' : res.copied ? '📋 已复制指令' : '触发失败';
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = item.status === 'mastered' ? '🔁 复查巩固' : '🔥 发起 5 连击二刷';
        }, 1800);
      }
    });

    $('btn-start-mode-b')?.addEventListener('click', () => {
      sendToConversation('使用 agent-interview-coach 进入模式 B，按中国大厂 60 分钟全真动态压力面（Lv.2 起步，含 ACM 手撕白板）对我进行模拟面试。');
    });
    $('btn-start-mode-a')?.addEventListener('click', () => {
      sendToConversation('使用 agent-interview-coach 进入模式 A，结合我当前工作区里的简历和项目源码做红绿灯排雷并生成四维面试防御卡。');
    });
  }

  async function init() {
    if (state.initialized) return;
    state.initialized = true;
    bindEvents();

    const urlWs = new URLSearchParams(location.search).get('workspace');
    if (urlWs) {
      state.workspace = urlWs;
    } else if (window.sidecar?.getWorkspaceUris) {
      try {
        const uris = await window.sidecar.getWorkspaceUris();
        if (Array.isArray(uris) && uris.length > 0) state.workspace = uris[0];
      } catch {}
    }

    if (window.sidecar?.onWorkspaceChange) {
      window.sidecar.onWorkspaceChange((uris) => {
        const next = Array.isArray(uris) && uris.length > 0 ? uris[0] : '';
        if (next && next !== state.workspace) {
          refresh(next);
        }
      });
    }

    await refresh();
  }

  window.InterviewDashboard = {
    init,
    refresh,
    setWorkspace: (ws) => refresh(ws),
    getWorkspace: () => state.workspace,
  };
})();
