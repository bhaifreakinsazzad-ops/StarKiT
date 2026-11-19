/**
 * StarkiT Google Drive Asset & Folder Browser
 * Uses lazy Firebase Auth (GoogleAuthProvider) OR direct read-only Drive OAuth token with in-memory token caching.
 */
export const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
export const DEFAULT_FOLDER_ID = '1cWiWNN5K8SONAxsGbeGONY46DumZod6z';

let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;
let firebaseAuthSdk = null;
let isSigningIn = false;
// In-memory cache ONLY (never persisted to localStorage or sessionStorage)
let cachedAccessToken = null;
let currentUser = null;

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

export function extractDriveFolderId(input) {
  const raw = String(input || '').trim();
  if (!raw) return DEFAULT_FOLDER_ID;
  const folderMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idParam = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) return idParam[1];
  if (/^[a-zA-Z0-9_-]{10,80}$/.test(raw)) return raw;
  return null;
}

async function ensureFirebaseInitialized() {
  if (firebaseAuth) return { auth: firebaseAuth, authSdk: firebaseAuthSdk };
  const adminHeaders = window.__STARKIT_ADMIN_HEADERS || {};
  if (!Object.keys(adminHeaders).length) {
    throw new Error('Authenticate in the Operations Portal first to initialize Google Sign-In.');
  }
  const [appSdk, authSdk, res] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    fetch('api/admin?action=get_drive_config', { headers: adminHeaders })
  ]);
  if (!res.ok) throw new Error('Unable to load server-side Google Sign-In configuration.');
  const payload = await res.json();
  if (!payload?.configured || !payload?.config?.apiKey) {
    throw new Error(
      'Google Sign-In OAuth is not configured on the server (set FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, and FIREBASE_PROJECT_ID in environment variables), or paste a short-lived Drive OAuth2 token below.'
    );
  }
  firebaseApp = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(payload.config);
  firebaseAuthSdk = authSdk;
  firebaseAuth = authSdk.getAuth(firebaseApp);
  googleProvider = new authSdk.GoogleAuthProvider();
  SCOPES.forEach((scope) => googleProvider.addScope(scope));
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  return { auth: firebaseAuth, authSdk };
}

export async function googleSignIn() {
  const { auth, authSdk } = await ensureFirebaseInitialized();
  try {
    isSigningIn = true;
    const result = await authSdk.signInWithPopup(auth, googleProvider);
    const credential = authSdk.GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) {
      throw new Error('Failed to obtain Google Drive access token.');
    }
    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function driveLogout() {
  if (firebaseAuth) {
    await firebaseAuth.signOut();
  }
  cachedAccessToken = null;
  currentUser = null;
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function isFolder(f) {
  return f.mimeType === 'application/vnd.google-apps.folder';
}

function isImage(f) {
  return typeof f.mimeType === 'string' && f.mimeType.startsWith('image/');
}

function isTextReadable(f) {
  const m = String(f.mimeType || '');
  return (
    m.startsWith('text/') ||
    m === 'application/json' ||
    /\.(json|csv|txt|md)$/i.test(f.name || '')
  );
}

async function driveFetchJson(url) {
  if (!cachedAccessToken) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` }
  });
  if (res.status === 401 || res.status === 403) {
    if (res.status === 401) cachedAccessToken = null;
    const payload = await res.json().catch(() => ({}));
    const msg = payload?.error?.message || `Google Drive authorization required (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error?.message || `Google Drive request failed (${res.status})`);
  }
  return res.json();
}

export async function initDriveSyncUI() {
  const root = document.getElementById('driveSyncMount');
  if (!root) return;

  const state = {
    needsAuth: true,
    loading: false,
    error: '',
    breadcrumbs: [{ id: DEFAULT_FOLDER_ID, name: 'Shared Catalog Folder' }],
    files: [],
    filterQuery: '',
    filterType: 'all',
    importedUrls: {},
    pendingImport: null,
    previewModal: null
  };

  let activeObjectUrls = [];
  function clearObjectUrls() {
    activeObjectUrls.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    activeObjectUrls = [];
  }

  function showToast(msg) {
    const t = document.getElementById('adminToast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      t.style.display = 'none';
    }, 3600);
  }

  async function loadFolder(folderId, pushBreadcrumbName = null) {
    if (!cachedAccessToken) {
      state.needsAuth = true;
      render();
      return;
    }
    state.loading = true;
    state.error = '';
    render();

    try {
      const folderMeta = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType&supportsAllDrives=true`
      );
      if (pushBreadcrumbName === 'REPLACE_ROOT') {
        state.breadcrumbs = [{ id: folderMeta.id, name: folderMeta.name || folderMeta.id }];
      } else if (typeof pushBreadcrumbName === 'number') {
        state.breadcrumbs = state.breadcrumbs.slice(0, pushBreadcrumbName + 1);
      } else if (pushBreadcrumbName === 'PUSH') {
        state.breadcrumbs.push({ id: folderMeta.id, name: folderMeta.name || folderMeta.id });
      } else if (state.breadcrumbs.length === 1 && state.breadcrumbs[0].id === folderMeta.id) {
        state.breadcrumbs[0].name = folderMeta.name || state.breadcrumbs[0].name;
      }

      const query = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`;
      const params = new URLSearchParams({
        q: query,
        fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,iconLink,imageMediaMetadata)',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        pageSize: '200',
        orderBy: 'folder,name'
      });

      const listData = await driveFetchJson(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
      state.files = Array.isArray(listData.files) ? listData.files : [];
      state.needsAuth = false;
    } catch (err) {
      if (err.code === 'AUTH_REQUIRED' || err.status === 401) {
        state.needsAuth = true;
        state.error = 'Please sign in with Google to browse and sync this folder.';
      } else {
        state.error = err.message || 'Unable to list files in this Google Drive folder.';
      }
    } finally {
      state.loading = false;
      render();
    }
  }

  async function hydrateThumbnails() {
    if (!cachedAccessToken) return;
    const imgs = root.querySelectorAll('img[data-drive-img-id]');
    for (const img of imgs) {
      const fid = img.dataset.driveImgId;
      if (!fid || img.dataset.loaded === 'true') continue;
      img.dataset.loaded = 'true';
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fid)}?alt=media&supportsAllDrives=true`,
          { headers: { Authorization: `Bearer ${cachedAccessToken}` } }
        );
        if (res.ok) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          activeObjectUrls.push(objUrl);
          img.src = objUrl;
        }
      } catch {}
    }
  }

  async function openTextOrImagePreview(file) {
    if (!cachedAccessToken) {
      state.needsAuth = true;
      render();
      return;
    }
    const modal = document.getElementById('drivePreviewModal');
    const titleEl = document.getElementById('drivePreviewTitle');
    const bodyEl = document.getElementById('drivePreviewBody');
    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = file.name;
    bodyEl.innerHTML = '<p style="color:#776d6b;font-weight:700;">Loading preview from Google Drive…</p>';
    modal.style.display = 'grid';

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${cachedAccessToken}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (isImage(file)) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        activeObjectUrls.push(url);
        bodyEl.innerHTML = `<img src="${url}" alt="${esc(file.name)}" style="max-height:65vh;max-width:100%;object-fit:contain;margin:auto;background:#f7f5f1;border:1px solid #dcd4cc;">`;
      } else {
        const text = await res.text();
        bodyEl.innerHTML = `<pre style="max-height:60vh;overflow:auto;background:#170000;color:#f7f5f1;padding:16px;font-size:0.78rem;line-height:1.5;white-space:pre-wrap;word-break:break-word;margin:0;">${esc(text.slice(0, 25000))}</pre>`;
      }
    } catch (err) {
      bodyEl.innerHTML = `<p style="color:#dc2626;font-weight:700;">Unable to load preview: ${esc(err.message)}</p>`;
    }
  }

  async function executeImport(file, targetSku, viewType) {
    if (!cachedAccessToken) {
      state.needsAuth = true;
      render();
      return;
    }
    const confirmBtn = document.getElementById('confirmDriveImportBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'IMPORTING TO SUPABASE…';
    }
    try {
      const adminHeaders = window.__STARKIT_ADMIN_HEADERS || {};
      const res = await fetch('api/admin?action=import_drive_asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders
        },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          sku: targetSku || 'UNASSIGNED',
          view_type: viewType || 'front',
          driveAccessToken: cachedAccessToken
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Import failed.');
      }
      state.importedUrls[file.id] = data.url;
      document.getElementById('driveImportConfirmModal').style.display = 'none';
      showToast(`Imported ${data.fileName} → ${data.storage_path}`);
      render();
    } catch (err) {
      showToast(`Import error: ${err.message}`);
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'CONFIRM IMPORT ↗';
      }
    }
  }

  function filteredFiles() {
    const q = state.filterQuery.trim().toLowerCase();
    return state.files.filter((f) => {
      const matchQuery = !q || (f.name && f.name.toLowerCase().includes(q));
      let matchType = true;
      if (state.filterType === 'folders') matchType = isFolder(f);
      else if (state.filterType === 'images') matchType = isImage(f);
      else if (state.filterType === 'docs') matchType = !isFolder(f) && !isImage(f);
      return matchQuery && matchType;
    });
  }

  function render() {
    clearObjectUrls();
    const activeFolder = state.breadcrumbs[state.breadcrumbs.length - 1];
    const catalog = window.STARKIT_CATALOG || [];
    const hoodieFolders = catalog
      .filter((p) => p.id && p.id.startsWith('STK-') && p.drive_folder)
      .map((p) => ({ id: extractDriveFolderId(p.drive_folder), label: `${p.id} · ${p.name}` }))
      .filter((x) => x.id);

    const quickFolderPills = [
      { id: DEFAULT_FOLDER_ID, label: 'MAIN SHARED FOLDER' },
      ...hoodieFolders
    ]
      .map(
        (x) =>
          `<button type="button" class="action-btn ${activeFolder.id === x.id ? 'active-drive-pill' : ''}" data-drive-jump="${esc(x.id)}" style="${activeFolder.id === x.id ? 'background:#170000;color:#fff;border-color:#170000;' : ''}font-size:0.7rem;">${esc(x.label)}</button>`
      )
      .join('');

    const authCardHtml = state.needsAuth
      ? `
        <div style="background:#f6f4f0;border:1px solid rgba(11,9,10,0.12);border-radius:6px;padding:24px;margin:16px 0;display:flex;flex-direction:column;gap:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px;">
            <div style="max-width:600px;">
              <div style="font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:#8e2934;font-weight:700;margin-bottom:6px;">Google Drive Connection</div>
              <h3 style="margin:0 0 6px;font-size:1.2rem;font-weight:700;color:#0b090a;">Connect Google Drive to browse studio assets</h3>
              <p style="margin:0;color:#645e5b;font-size:0.86rem;line-height:1.55;">
                Sign in with your Google account or supply a short-lived <code>drive.readonly</code> OAuth access token to list subfolders, preview photography, and import assets from <code>${esc(activeFolder.id)}</code>.
              </p>
            </div>
            <button type="button" id="driveGoogleSignInBtn" class="gsi-material-button">
              <div class="gsi-material-button-state"></div>
              <div class="gsi-material-button-content-wrapper">
                <div class="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="display:block;">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span class="gsi-material-button-contents">Sign in with Google</span>
                <span style="display:none;">Sign in with Google</span>
              </div>
            </button>
          </div>
          <form id="driveTokenForm" style="display:flex;gap:10px;flex-wrap:wrap;padding-top:12px;border-top:1px solid rgba(11,9,10,0.1);">
            <input type="password" id="driveManualTokenInput" class="search-field" style="flex:1;min-width:240px;font-family:var(--font-mono);font-size:0.82rem;" placeholder="Or paste Google Drive OAuth2 Access Token (ya29.… · memory-only)" autocomplete="off">
            <button type="submit" class="action-btn" style="min-height:40px;padding:8px 16px;">Connect with Token ↗</button>
          </form>
        </div>`
      : `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;padding:12px 16px;margin:14px 0;">
          <div style="font-size:0.82rem;color:#166534;font-weight:700;">
            ✓ Connected as <strong>${esc(currentUser?.email || currentUser?.displayName || 'OAuth Drive Session')}</strong> · Read-only Drive session active
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" id="driveRefreshBtn" class="action-btn">↻ Refresh Folder</button>
            <button type="button" id="driveSignOutBtn" class="action-btn">Disconnect Google</button>
          </div>
        </div>`;

    const breadcrumbsHtml = state.breadcrumbs
      .map(
        (b, idx) =>
          `<button type="button" data-crumb-idx="${idx}" style="background:transparent;border:0;padding:2px 4px;font-weight:800;font-size:0.78rem;cursor:pointer;text-decoration:${idx === state.breadcrumbs.length - 1 ? 'none' : 'underline'};color:${idx === state.breadcrumbs.length - 1 ? '#170000' : '#776d6b'};">${esc(b.name)}</button>`
      )
      .join(' <span style="color:#999;">/</span> ');

    const items = filteredFiles();
    const listHtml = state.needsAuth
      ? ''
      : state.loading
      ? `<div style="padding:40px;text-align:center;color:#776d6b;font-weight:700;">Loading files from Google Drive…</div>`
      : items.length === 0
      ? `<div style="padding:40px;text-align:center;color:#776d6b;border:1px dashed #dcd4cc;">No matching files found in this folder.</div>`
      : `<div class="drive-grid">
          ${items
            .map((f) => {
              const folder = isFolder(f);
              const img = isImage(f);
              const textDoc = isTextReadable(f);
              const importedUrl = state.importedUrls[f.id];
              const mediaHtml = folder
                ? `<div style="font-size:2.4rem;">📁</div><span style="font-size:0.65rem;font-weight:800;letter-spacing:0.1em;color:#776d6b;margin-top:4px;">FOLDER</span>`
                : img
                ? `<img data-drive-img-id="${esc(f.id)}" alt="${esc(f.name)}" style="width:100%;height:100%;object-fit:contain;background:#f7f5f1;">`
                : `<div style="font-size:2rem;">📄</div><span style="font-size:0.65rem;font-weight:800;letter-spacing:0.08em;color:#776d6b;margin-top:4px;">${esc((f.mimeType || '').split('.').pop().split('/').pop().toUpperCase())}</span>`;

              const actionsHtml = folder
                ? `<button type="button" class="action-btn" data-open-folder="${esc(f.id)}" data-folder-name="${esc(f.name)}" style="flex:1;justify-content:center;">Open Folder →</button>`
                : `
                  ${img || textDoc ? `<button type="button" class="action-btn" data-preview-file="${esc(f.id)}">Preview</button>` : ''}
                  ${img ? `<button type="button" class="action-btn" data-import-file="${esc(f.id)}" style="background:#170000;color:#fff;border-color:#170000;">${importedUrl ? 'Re-Import' : 'Import Image'}</button>` : ''}
                  ${f.webViewLink ? `<a href="${esc(f.webViewLink)}" target="_blank" rel="noopener noreferrer" class="action-btn">Drive ↗</a>` : ''}
                `;

              return `
                <article class="drive-card">
                  <div class="drive-thumb">${mediaHtml}</div>
                  <div class="drive-meta">
                    <div style="font-weight:800;font-size:0.84rem;word-break:break-word;line-height:1.3;" title="${esc(f.name)}">${esc(f.name)}</div>
                    <div style="font-size:0.7rem;color:#776d6b;margin-top:4px;">
                      ${folder ? 'Folder' : formatBytes(f.size)} · ${f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : ''}
                    </div>
                    ${importedUrl ? `<div style="font-size:0.7rem;color:#15803d;font-weight:800;margin-top:4px;">✓ Saved: <code>${esc(importedUrl)}</code></div>` : ''}
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">${actionsHtml}</div>
                  </div>
                </article>`;
            })
            .join('')}
        </div>`;

    root.innerHTML = `
      <div class="section-card">
        <div class="section-head-bar">
          <div>
            <h2>GOOGLE DRIVE FOLDER &amp; MEDIA SYNC</h2>
            <p style="margin:4px 0 0;font-size:0.85rem;color:var(--mute);">Browse your linked StarkiT Drive folders, inspect photography and sheets, and import approved product images directly into the storefront.</p>
          </div>
          <a href="https://drive.google.com/drive/folders/${esc(activeFolder.id)}" target="_blank" rel="noopener noreferrer" class="action-btn">Open Current Folder in Drive ↗</a>
        </div>

        <form id="driveFolderUrlForm" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
          <input type="text" id="driveFolderInput" class="search-field" style="flex:1;min-width:260px;" value="${esc(activeFolder.id)}" placeholder="Paste Google Drive folder URL or Folder ID...">
          <button type="submit" class="btn" style="min-height:42px;padding:8px 18px;">LOAD FOLDER ↗</button>
        </form>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">${quickFolderPills}</div>

        ${authCardHtml}

        ${state.error ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;font-size:0.84rem;font-weight:700;margin-bottom:14px;">${esc(state.error)}</div>` : ''}

        ${!state.needsAuth ? `
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin:16px 0;padding-bottom:12px;border-bottom:1px solid #dcd4cc;">
            <div>Path: ${breadcrumbsHtml}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <input type="search" id="driveSearchInput" class="search-field" value="${esc(state.filterQuery)}" placeholder="Filter files in folder..." style="min-width:190px;">
              <select id="driveTypeFilter" class="sort-field">
                <option value="all" ${state.filterType === 'all' ? 'selected' : ''}>All Items (${state.files.length})</option>
                <option value="folders" ${state.filterType === 'folders' ? 'selected' : ''}>Folders</option>
                <option value="images" ${state.filterType === 'images' ? 'selected' : ''}>Images</option>
                <option value="docs" ${state.filterType === 'docs' ? 'selected' : ''}>Docs &amp; Data</option>
              </select>
            </div>
          </div>
        ` : ''}

        ${listHtml}
      </div>
    `;

    // Bind events
    root.querySelector('#driveGoogleSignInBtn')?.addEventListener('click', async () => {
      try {
        await googleSignIn();
        state.needsAuth = false;
        showToast('Google Drive connected.');
        await loadFolder(activeFolder.id);
      } catch (err) {
        state.error = err.message || 'Google sign-in was cancelled or failed.';
        render();
      }
    });

    root.querySelector('#driveTokenForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tokenVal = root.querySelector('#driveManualTokenInput')?.value?.trim() || '';
      if (tokenVal.length < 20) {
        state.error = 'Please enter a valid Google Drive OAuth2 access token.';
        render();
        return;
      }
      cachedAccessToken = tokenVal;
      currentUser = { displayName: 'OAuth Token Session' };
      state.needsAuth = false;
      showToast('Google Drive OAuth token connected.');
      await loadFolder(activeFolder.id);
    });

    root.querySelector('#driveSignOutBtn')?.addEventListener('click', async () => {
      await driveLogout();
      state.needsAuth = true;
      state.files = [];
      showToast('Disconnected Google Drive session.');
      render();
    });

    root.querySelector('#driveRefreshBtn')?.addEventListener('click', () => {
      loadFolder(activeFolder.id);
    });

    root.querySelector('#driveFolderUrlForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputVal = root.querySelector('#driveFolderInput')?.value;
      const fid = extractDriveFolderId(inputVal);
      if (!fid) {
        state.error = 'Please enter a valid Google Drive folder URL or Folder ID.';
        render();
        return;
      }
      if (!cachedAccessToken) {
        state.breadcrumbs = [{ id: fid, name: fid }];
        state.needsAuth = true;
        render();
        return;
      }
      loadFolder(fid, 'REPLACE_ROOT');
    });

    root.querySelectorAll('[data-drive-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fid = btn.dataset.driveJump;
        if (!cachedAccessToken) {
          state.breadcrumbs = [{ id: fid, name: fid }];
          state.needsAuth = true;
          render();
          return;
        }
        loadFolder(fid, 'REPLACE_ROOT');
      });
    });

    root.querySelectorAll('[data-crumb-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.crumbIdx, 10);
        const target = state.breadcrumbs[idx];
        if (target) loadFolder(target.id, idx);
      });
    });

    root.querySelector('#driveSearchInput')?.addEventListener('input', (e) => {
      state.filterQuery = e.target.value;
      render();
      const el = root.querySelector('#driveSearchInput');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });

    root.querySelector('#driveTypeFilter')?.addEventListener('change', (e) => {
      state.filterType = e.target.value;
      render();
    });

    root.querySelectorAll('[data-open-folder]').forEach((btn) => {
      btn.addEventListener('click', () => {
        loadFolder(btn.dataset.openFolder, 'PUSH');
      });
    });

    root.querySelectorAll('[data-preview-file]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const file = state.files.find((x) => x.id === btn.dataset.previewFile);
        if (file) openTextOrImagePreview(file);
      });
    });

    root.querySelectorAll('[data-import-file]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const file = state.files.find((x) => x.id === btn.dataset.importFile);
        if (!file) return;
        state.pendingImport = file;
        const modal = document.getElementById('driveImportConfirmModal');
        const descEl = document.getElementById('driveImportDesc');
        const skuSelect = document.getElementById('driveImportSku');
        const viewSelect = document.getElementById('driveImportView');
        if (skuSelect && !skuSelect.options.length) {
          const catalog = window.STARKIT_CATALOG || [];
          const opts = catalog
            .flatMap((p) =>
              (p.variants || []).map(
                (v) => `<option value="${esc(v.sku)}">${esc(v.sku)} — ${esc(p.name)} (${esc(v.color)})</option>`
              )
            )
            .join('');
          skuSelect.innerHTML = `<option value="UNASSIGNED">UNASSIGNED (Library Asset)</option>${opts}`;
        }
        if (descEl && modal) {
          descEl.innerHTML = `Download <strong>${esc(file.name)}</strong> (${formatBytes(file.size)}) from Google Drive and upload it to Supabase Storage for the selected SKU and view.`;
          const confirmBtn = document.getElementById('confirmDriveImportBtn');
          if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'CONFIRM IMPORT ↗';
            confirmBtn.onclick = () =>
              executeImport(
                file,
                skuSelect ? skuSelect.value : 'UNASSIGNED',
                viewSelect ? viewSelect.value : 'front'
              );
          }
          modal.style.display = 'grid';
        }
      });
    });

    if (!state.needsAuth && state.files.length > 0) {
      hydrateThumbnails();
    }
  }

  async function attachFirebaseAuthListener() {
    if (!Object.keys(window.__STARKIT_ADMIN_HEADERS || {}).length) return;
    try {
      const { auth, authSdk } = await ensureFirebaseInitialized();
      authSdk.onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user && cachedAccessToken) {
          state.needsAuth = false;
          loadFolder(state.breadcrumbs[state.breadcrumbs.length - 1].id);
        } else if (!isSigningIn && !cachedAccessToken) {
          cachedAccessToken = null;
          state.needsAuth = true;
          render();
        }
      });
    } catch {
      // Non-fatal: manual OAuth token mode in #driveTokenForm remains operational even without Firebase env vars
    }
  }

  window.addEventListener('starkit:admin-authenticated', attachFirebaseAuthListener);
  attachFirebaseAuthListener();

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDriveSyncUI);
} else {
  initDriveSyncUI();
}
