let currentFilter = 'all';
let currentView = 'grid';
let allFiles = [];

const ICONS = {
  image: '🖼️', video: '🎬', audio: '🎵', application: '📦',
  text: '📄', pdf: '📋', default: '📁'
};

function getIcon(type, name) {
  if (!type) return ICONS.default;
  if (type.startsWith('image')) return '🖼️';
  if (type.startsWith('video')) return '🎬';
  if (type.startsWith('audio')) return '🎵';
  if (type.includes('pdf')) return '📋';
  if (type.includes('zip') || type.includes('tar') || type.includes('gz')) return '🗜️';
  if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
  if (type.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) return '📊';
  if (type.startsWith('text')) return '📄';
  return ICONS.default;
}

function getIconBg(type) {
  if (!type) return 'rgba(139,143,168,0.15)';
  if (type.startsWith('image')) return 'rgba(62,207,142,0.15)';
  if (type.startsWith('video')) return 'rgba(108,138,255,0.15)';
  if (type.startsWith('audio')) return 'rgba(143,106,255,0.15)';
  if (type.includes('pdf')) return 'rgba(255,95,95,0.15)';
  if (type.includes('zip') || type.includes('tar')) return 'rgba(245,166,35,0.15)';
  if (type.startsWith('text')) return 'rgba(108,138,255,0.15)';
  return 'rgba(139,143,168,0.15)';
}

async function loadFiles() {
  try {
    const search = document.getElementById('searchInput').value;
    const res = await fetch(`/api/files?filter=${currentFilter}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    allFiles = data.files;
    document.getElementById('fileCount').textContent = `${data.count} file${data.count !== 1 ? 's' : ''}`;
    renderFiles(allFiles);
    loadStats();
  } catch (e) { showToast('Failed to load files', 'error'); }
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const d = await res.json();
    document.getElementById('storageBar').style.width = Math.min(d.used_percent, 100) + '%';
    document.getElementById('usedStr').textContent = d.used_str;
    document.getElementById('limitStr').textContent = d.limit_str;
    document.getElementById('totalFiles').textContent = d.total_files;
    document.getElementById('usedPct').textContent = d.used_percent + '%';
  } catch(e) {}
}

function renderFiles(files) {
  const grid = document.getElementById('filesGrid');
  const list = document.getElementById('filesList');
  const empty = document.getElementById('emptyState');

  grid.innerHTML = '';
  list.innerHTML = '';

  if (!files.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  files.forEach(f => {
    const icon = getIcon(f.type, f.name);
    const bg = getIconBg(f.type);
    const isImg = f.type && f.type.startsWith('image');

    // Grid card
    const card = document.createElement('div');
    card.className = 'file-card';
    card.innerHTML = `
      <div class="file-card-actions">
        <button class="act-btn" onclick="event.stopPropagation();renameFile('${f.name}')" title="Rename">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="act-btn del" onclick="event.stopPropagation();deleteFile('${f.name}')" title="Delete">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
      ${isImg ? `<img class="file-thumb" src="${f.url}" alt="${f.name}" onerror="this.style.display='none'">` : `<div class="file-card-icon" style="background:${bg}">${icon}</div>`}
      <div class="file-card-name">${f.name}</div>
      <div class="file-card-meta">${f.size} · ${f.modified}</div>
    `;
    card.addEventListener('click', () => previewFile(f));
    grid.appendChild(card);

    // List row
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
      <span class="file-row-icon">${icon}</span>
      <span class="file-row-name">${f.name}</span>
      <span class="file-row-meta">${f.size}</span>
      <span class="file-row-meta">${f.modified}</span>
      <div class="file-row-actions">
        <button class="act-btn" onclick="event.stopPropagation();renameFile('${f.name}')" title="Rename">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="act-btn del" onclick="event.stopPropagation();deleteFile('${f.name}')" title="Delete">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    `;
    row.addEventListener('click', () => previewFile(f));
    list.appendChild(row);
  });
}

async function uploadFiles(files) {
  if (!files.length) return;
  const prog = document.createElement('div');
  prog.className = 'upload-progress';
  prog.innerHTML = `<div class="spinner"></div><span>Uploading ${files.length} file${files.length>1?'s':''}...</span>`;
  document.body.appendChild(prog);
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    showToast(`${data.count} file${data.count>1?'s':''} uploaded!`, 'success');
    loadFiles();
  } catch(e) {
    showToast('Upload failed', 'error');
  } finally {
    prog.remove();
    document.getElementById('fileInput').value = '';
  }
}

async function deleteFile(name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    await fetch(`/api/delete/${encodeURIComponent(name)}`, { method: 'DELETE' });
    showToast('File deleted', 'success');
    loadFiles();
  } catch(e) { showToast('Delete failed', 'error'); }
}

async function renameFile(name) {
  const newName = prompt('Rename file:', name);
  if (!newName || newName === name) return;
  try {
    const res = await fetch('/api/rename', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ old_name: name, new_name: newName })
    });
    const data = await res.json();
    if (data.success) { showToast('File renamed', 'success'); loadFiles(); }
    else showToast(data.error || 'Rename failed', 'error');
  } catch(e) { showToast('Rename failed', 'error'); }
}

function previewFile(f) {
  document.getElementById('previewName').textContent = f.name;
  document.getElementById('previewDownload').href = f.url;
  document.getElementById('previewDownload').download = f.name;
  const body = document.getElementById('previewBody');
  body.innerHTML = '';
  if (f.type && f.type.startsWith('image')) {
    body.innerHTML = `<img src="${f.url}" alt="${f.name}">`;
  } else if (f.type && f.type.startsWith('video')) {
    body.innerHTML = `<video controls src="${f.url}"></video>`;
  } else if (f.type && f.type.startsWith('audio')) {
    body.innerHTML = `<audio controls src="${f.url}" style="width:100%"></audio>`;
  } else if (f.type && f.type.includes('pdf')) {
    body.innerHTML = `<iframe src="${f.url}"></iframe>`;
  } else if (f.type && (f.type.startsWith('text') || f.type.includes('json') || f.type.includes('javascript') || f.type.includes('xml'))) {
    fetch(f.url).then(r=>r.text()).then(t=>{
      body.innerHTML = `<pre>${escapeHtml(t.slice(0,5000))}${t.length>5000?'\n... (truncated)':''}</pre>`;
    });
  } else {
    body.innerHTML = `<div class="no-preview">
      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <div>No preview available</div><div style="font-size:12px;margin-top:4px;color:#5c6079">Download to view this file</div>
    </div>`;
  }
  document.getElementById('previewModal').classList.remove('hidden');
}

function closePreview(e) {
  if (e.target.id === 'previewModal') closePreviewBtn();
}

function closePreviewBtn() {
  document.getElementById('previewModal').classList.add('hidden');
  document.getElementById('previewBody').innerHTML = '';
}

function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const titles = { all: 'All Files', image: 'Images', document: 'Documents', video: 'Videos' };
  document.getElementById('sectionTitle').textContent = titles[f] || 'Files';
  loadFiles();
}

function setView(v) {
  currentView = v;
  const grid = document.getElementById('filesGrid');
  const list = document.getElementById('filesList');
  document.getElementById('btnGrid').classList.toggle('active', v === 'grid');
  document.getElementById('btnList').classList.toggle('active', v === 'list');
  if (v === 'grid') { grid.classList.remove('hidden'); list.classList.add('hidden'); }
  else { list.classList.remove('hidden'); grid.classList.add('hidden'); }
}

let searchTimer;
function searchFiles() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadFiles, 250);
}

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => t.className = 'toast', 2800);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Drag & drop
const dropZone = document.getElementById('dropZone');
let dragCounter = 0;

document.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; dropZone.classList.add('active'); });
document.addEventListener('dragleave', e => { dragCounter--; if (dragCounter===0) dropZone.classList.remove('active'); });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.remove('active');
  if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closePreviewBtn(); });

// Init
setView('grid');
loadFiles();
