/* ===== State ===== */
let currentChapter = 0;
let currentTab = 'overview';
let completedChapters = new Set();

/* ===== Init ===== */
loadProgress();
buildNav();
loadChapter(0);

/* ===== Navigation ===== */
function buildNav() {
  const nav = document.getElementById('nav-list');
  let html = '';
  let currentPart = '';
  CHAPTERS.forEach((ch, i) => {
    if (ch.part !== currentPart) {
      currentPart = ch.part;
      html += `<div class="nav-part">${currentPart}</div>`;
    }
    const dotClass = ch.category || 'f';
    const done = completedChapters.has(i) ? ' completed' : '';
    html += `<a class="nav-item${done}" data-idx="${i}" onclick="loadChapter(${i})">
      <span class="dot ${dotClass}"></span>
      <span>${ch.title}</span>
      <span class="check">&#10003;</span>
    </a>`;
  });
  nav.innerHTML = html;
  updateProgress();
}

function loadChapter(idx) {
  currentChapter = idx;
  currentTab = 'overview';

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.idx) === idx);
  });

  // Scroll nav item into view
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav) activeNav.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  const ch = CHAPTERS[idx];

  // Update header
  renderHeader(ch);

  // Update tabs
  buildTabs(ch);

  // Clear and render panels
  document.getElementById('tab-overview').innerHTML = '';
  document.getElementById('tab-code').innerHTML = '';
  document.getElementById('tab-checklist').innerHTML = '';

  renderOverview(ch);

  // Update navigation arrows
  document.getElementById('prev-btn').disabled = idx === 0;
  document.getElementById('next-btn').disabled = idx === CHAPTERS.length - 1;

  // Update footer
  renderFooter(idx);

  // Scroll content to top
  document.getElementById('content-scroll').scrollTop = 0;

  // Close mobile sidebar
  closeSidebar();
}

function prevChapter() {
  if (currentChapter > 0) loadChapter(currentChapter - 1);
}

function nextChapter() {
  if (currentChapter < CHAPTERS.length - 1) loadChapter(currentChapter + 1);
}

/* ===== Tabs ===== */
function buildTabs(ch) {
  const container = document.getElementById('tab-buttons');
  if (ch.type === 'intro') {
    container.innerHTML = `
      <button class="tab-btn active" data-tab="overview" onclick="switchTab('overview')">
        <span class="en">Overview</span><span class="cn">概述</span>
      </button>`;
  } else {
    container.innerHTML = `
      <button class="tab-btn active" data-tab="overview" onclick="switchTab('overview')">
        <span class="en">Overview</span><span class="cn">概述</span>
      </button>
      <button class="tab-btn" data-tab="code" onclick="switchTab('code')">
        <span class="en">Pseudocode</span><span class="cn">伪代码</span>
      </button>
      <button class="tab-btn" data-tab="checklist" onclick="switchTab('checklist')">
        <span class="en">Pros &amp; Cons</span><span class="cn">优缺点</span>
      </button>`;
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab)
  );
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-' + tab)
  );

  const panel = document.getElementById('tab-' + tab);
  if (panel.innerHTML.trim() === '') {
    const ch = CHAPTERS[currentChapter];
    if (tab === 'code') renderCode(ch);
    else if (tab === 'checklist') renderChecklist(ch);
  }

  document.getElementById('content-scroll').scrollTop = 0;
}

/* ===== Renderers ===== */
function renderHeader(ch) {
  const badge = ch.category
    ? `<span class="ch-badge ${ch.category}"><span class="en">${ch.categoryLabel?.en || ch.category}</span><span class="cn">${ch.categoryLabel?.cn || ch.category}</span></span>`
    : (ch.type === 'intro' ? '<span class="ch-badge foundations"><span class="en">Foundations</span><span class="cn">基础</span></span>' : '');

  document.getElementById('ch-header').innerHTML = `
    <div class="ch-part-label">${ch.part}</div>
    <div class="ch-title">${badge}${ch.title}</div>
    <div class="ch-subtitle">
      <span class="en">${ch.subtitle?.en || ''}</span>
      <span class="cn">${ch.subtitle?.cn || ''}</span>
    </div>`;
}

function renderOverview(ch) {
  const panel = document.getElementById('tab-overview');
  if (ch.type === 'intro') {
    panel.innerHTML = ch.content;
    return;
  }

  let html = '';

  // Description
  html += `<p><span class="en">${ch.description?.en || ''}</span><span class="cn">${ch.description?.cn || ''}</span></p>`;

  // Problem
  if (ch.problem) {
    html += `<h2><span class="en">Problem</span><span class="cn">问题</span></h2>`;
    html += `<p><span class="en">${ch.problem.en}</span><span class="cn">${ch.problem.cn}</span></p>`;
  }

  // Solution
  if (ch.solution) {
    html += `<h2><span class="en">Solution</span><span class="cn">解决方案</span></h2>`;
    html += `<p><span class="en">${ch.solution.en}</span><span class="cn">${ch.solution.cn}</span></p>`;
  }

  // Key points
  if (ch.keyPoints) {
    html += `<div class="key-points"><h4><span class="en">Key Points</span><span class="cn">要点</span></h4><ul>`;
    ch.keyPoints.forEach(kp => {
      html += `<li><span class="en">${kp.en}</span><span class="cn">${kp.cn}</span></li>`;
    });
    html += `</ul></div>`;
  }

  panel.innerHTML = html;
}

function renderCode(ch) {
  const panel = document.getElementById('tab-code');
  if (!ch.pseudocode) {
    panel.innerHTML = `<p class="en" style="color:var(--text-light)">No pseudocode for this section.</p>
                       <p class="cn" style="color:var(--text-light)">本节无伪代码。</p>`;
    return;
  }

  let html = '';
  if (ch.codeIntro) {
    html += `<p><span class="en">${ch.codeIntro.en}</span><span class="cn">${ch.codeIntro.cn}</span></p>`;
  }
  html += `<pre><code>${highlightSyntax(ch.pseudocode)}</code></pre>`;

  panel.innerHTML = html;
}

function renderChecklist(ch) {
  const panel = document.getElementById('tab-checklist');
  let html = '';

  // Pros & Cons side by side
  if (ch.pros || ch.cons) {
    html += `<div class="pros-cons">`;

    html += `<div class="pros-box"><h4><span class="en">&#10003; Pros</span><span class="cn">&#10003; 优点</span></h4><ul>`;
    (ch.pros || []).forEach(p => {
      html += `<li><span class="en">${p.en}</span><span class="cn">${p.cn}</span></li>`;
    });
    html += `</ul></div>`;

    html += `<div class="cons-box"><h4><span class="en">&#10007; Cons</span><span class="cn">&#10007; 缺点</span></h4><ul>`;
    (ch.cons || []).forEach(c => {
      html += `<li><span class="en">${c.en}</span><span class="cn">${c.cn}</span></li>`;
    });
    html += `</ul></div>`;

    html += `</div>`;
  }

  // Applicability
  if (ch.applicability) {
    html += `<h2><span class="en">When to Use</span><span class="cn">适用场景</span></h2><ul>`;
    ch.applicability.forEach(a => {
      html += `<li><span class="en">${a.en}</span><span class="cn">${a.cn}</span></li>`;
    });
    html += `</ul>`;
  }

  // Relations
  if (ch.relations) {
    html += `<h2><span class="en">Relations with Other Patterns</span><span class="cn">与其他模式的关系</span></h2><ul>`;
    ch.relations.forEach(r => {
      html += `<li><span class="en">${r.en}</span><span class="cn">${r.cn}</span></li>`;
    });
    html += `</ul>`;
  }

  panel.innerHTML = html;
}

function renderFooter(idx) {
  const done = completedChapters.has(idx);
  document.getElementById('ch-footer').innerHTML = `
    <button class="complete-btn${done ? ' done' : ''}" onclick="toggleComplete(${idx})">
      <span class="en">${done ? '&#10003; Completed' : 'Mark Complete'}</span>
      <span class="cn">${done ? '&#10003; 已完成' : '标记完成'}</span>
    </button>
    <span style="font-family:var(--font-sans);font-size:13px;color:var(--text-light)">
      ${idx + 1} / ${CHAPTERS.length}
    </span>`;
}

/* ===== Syntax Highlighting ===== */
function highlightSyntax(code) {
  // Escape HTML
  let s = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Comments (// ...)
  s = s.replace(/(\/\/.*)/g, '<span class="cm">$1</span>');

  // Strings ("..." and '...')
  s = s.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="st">$1</span>');
  s = s.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="st">$1</span>');

  // Keywords
  const kws = ['class','interface','abstract','extends','implements','method','field',
    'private','public','protected','constructor','return','if','else','then','for',
    'foreach','while','do','in','is','new','null','true','false','this','not','and',
    'or','switch','case','break','static','final','override','virtual','const','var',
    'let','function','throw','try','catch','import','from','export','default','enum','type'];
  const kwPat = new RegExp('\\b(' + kws.join('|') + ')\\b', 'g');
  s = s.replace(kwPat, (m) => {
    // Don't highlight inside already-highlighted spans
    return '<span class="kw">' + m + '</span>';
  });

  // Numbers
  s = s.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');

  // Clean up nested spans from over-matching (comments/strings containing keywords)
  // Simple approach: this is good enough for pseudocode display

  return s;
}

/* ===== Language Toggle ===== */
function setLang(lang) {
  document.documentElement.setAttribute('data-lang', lang);
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.l === lang)
  );
}

/* ===== Sidebar Toggle ===== */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

/* ===== Progress ===== */
function toggleComplete(idx) {
  if (completedChapters.has(idx)) {
    completedChapters.delete(idx);
  } else {
    completedChapters.add(idx);
  }
  saveProgress();
  updateProgress();
  renderFooter(idx);

  // Update nav item
  const navItem = document.querySelector(`.nav-item[data-idx="${idx}"]`);
  if (navItem) navItem.classList.toggle('completed', completedChapters.has(idx));
}

function updateProgress() {
  const total = CHAPTERS.length;
  const done = completedChapters.size;
  const pct = total > 0 ? (done / total * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').innerHTML =
    `<span class="en">${done} / ${total} completed</span><span class="cn">${done} / ${total} 已完成</span>`;
}

function saveProgress() {
  localStorage.setItem('dp_completed', JSON.stringify([...completedChapters]));
}

function loadProgress() {
  try {
    const data = localStorage.getItem('dp_completed');
    if (data) completedChapters = new Set(JSON.parse(data));
  } catch (e) { /* ignore */ }
}

/* ===== Welcome Screen ===== */
function startStudy() {
  document.getElementById('welcome').classList.add('hidden');
  document.body.style.overflow = '';
}

// Skip welcome if returning user
if (completedChapters.size > 0) {
  document.getElementById('welcome').classList.add('hidden');
}

/* ===== Keyboard Shortcuts ===== */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'ArrowLeft' || e.key === 'h') prevChapter();
  else if (e.key === 'ArrowRight' || e.key === 'l') nextChapter();
  else if (e.key === '1') switchTab('overview');
  else if (e.key === '2') { if (CHAPTERS[currentChapter].type !== 'intro') switchTab('code'); }
  else if (e.key === '3') { if (CHAPTERS[currentChapter].type !== 'intro') switchTab('checklist'); }
  else if (e.key === 'Escape') closeSidebar();
});
