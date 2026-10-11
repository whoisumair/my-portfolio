/* Umair Admin Panel — Client logic */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

let contentCache = null;

function showStatus(msg, type = 'success') {
  const el = $('#statusMsg');
  el.textContent = msg;
  el.className = 'status-msg ' + type;
  setTimeout(() => { el.className = 'status-msg'; }, 5000);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = '/admin/login.html';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---- Navigation ----
$$('#sideNav a').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const panel = link.dataset.panel;
    $$('#sideNav a').forEach((a) => a.classList.remove('active'));
    link.classList.add('active');
    $$('.panel').forEach((p) => p.classList.remove('active'));
    const target = $('#panel-' + panel);
    if (target) target.classList.add('active');
    if (panel === 'portfolio') loadProjects();
    if (panel === 'services') loadServices();
    if (panel === 'achievements') loadAchievements();
    if (panel === 'home' || panel === 'about' || panel === 'contact' || panel === 'themes') loadContentIntoForms();
  });
});

$$('[data-goto]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = $(`#sideNav a[data-panel="${btn.dataset.goto}"]`);
    if (a) a.click();
  });
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
});

// ---- Init ----
async function init() {
  try {
    const { user } = await api('/api/auth/me');
    $('#userBadge').textContent = `Signed in as ${user.displayName || user.username}`;
    if (user.mustChangePassword) {
      $('#mustChangeBanner').classList.add('show');
    }
    contentCache = await api('/api/admin/content');
    renderDashboard();
    loadContentIntoForms();
  } catch (e) {
    window.location.href = '/admin/login.html';
  }
}

function renderDashboard() {
  const c = contentCache || {};
  const services = c.services || [];
  const projects = c.projects || [];
  const ach = c.achievements || [];
  $('#dashStats').innerHTML = `
    <div class="stat-box"><div class="num">${services.length}</div><div class="lbl">Services</div></div>
    <div class="stat-box"><div class="num">${projects.length}</div><div class="lbl">Projects</div></div>
    <div class="stat-box"><div class="num">${ach.length}</div><div class="lbl">Awards</div></div>
    <div class="stat-box"><div class="num">${c.theme || '—'}</div><div class="lbl">Active Theme</div></div>
  `;
}

function loadContentIntoForms() {
  const c = contentCache || {};
  // Home
  if (c.home) {
    $('#home_heroBadge').value = c.home.heroBadge || '';
    $('#home_heroTitle').value = c.home.heroTitle || '';
    $('#home_heroSubtitle').value = c.home.heroSubtitle || '';
    $('#home_heroTagline').value = c.home.heroTagline || '';
  }
  // About
  if (c.about) {
    $('#about_storyTitle').value = c.about.storyTitle || '';
    $('#about_paragraphs').value = (c.about.storyParagraphs || []).join('\n\n');
    $('#about_mission').value = c.about.mission || '';
  }
  // Contact
  if (c.contact) {
    $('#c_name').value = (c.site && c.site.name) || 'Umair';
    $('#c_email').value = c.contact.email || '';
    $('#c_whatsapp').value = c.contact.whatsapp || '';
    $('#c_instagram').value = c.contact.instagram || '';
    $('#c_youtube').value = c.contact.youtube || '';
    $('#c_behance').value = c.contact.behance || '';
    $('#c_linkedin').value = c.contact.linkedin || '';
  }
  // Theme
  $$('.theme-option').forEach((el) => {
    el.classList.toggle('active', el.dataset.theme === (c.theme || 'charcoal-orange'));
  });
}

// Home save
$('#homeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const home = {
      ...(contentCache.home || {}),
      heroBadge: $('#home_heroBadge').value,
      heroTitle: $('#home_heroTitle').value,
      heroSubtitle: $('#home_heroSubtitle').value,
      heroTagline: $('#home_heroTagline').value
    };
    await api('/api/admin/content/home', { method: 'PUT', body: JSON.stringify(home) });
    contentCache.home = home;
    showStatus('Home content saved.');
  } catch (err) { showStatus(err.message, 'error'); }
});

// About save
$('#aboutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const about = {
      storyTitle: $('#about_storyTitle').value,
      storyParagraphs: $('#about_paragraphs').value.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
      mission: $('#about_mission').value
    };
    await api('/api/admin/content/about', { method: 'PUT', body: JSON.stringify(about) });
    contentCache.about = about;
    showStatus('About content saved.');
  } catch (err) { showStatus(err.message, 'error'); }
});

// Contact save
$('#contactFormAdmin').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const contact = {
      email: $('#c_email').value,
      whatsapp: $('#c_whatsapp').value,
      instagram: $('#c_instagram').value,
      youtube: $('#c_youtube').value,
      behance: $('#c_behance').value,
      linkedin: $('#c_linkedin').value
    };
    const site = { ...(contentCache.site || {}), name: $('#c_name').value };
    await api('/api/admin/content/contact', { method: 'PUT', body: JSON.stringify(contact) });
    await api('/api/admin/content/site', { method: 'PUT', body: JSON.stringify(site) });
    contentCache.contact = contact;
    contentCache.site = site;
    showStatus('Contact information saved.');
  } catch (err) { showStatus(err.message, 'error'); }
});

// Services
async function loadServices() {
  const list = await api('/api/admin/services');
  const tbody = $('#servicesTable');
  tbody.innerHTML = list.map((s) => `
    <tr>
      <td>${esc(s.title)}</td>
      <td>$${s.price}</td>
      <td>${esc(s.priceUnit)}</td>
      <td>${s.published ? 'Yes' : 'No'}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editService('${s.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteService('${s.id}')">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No services yet.</td></tr>';
  contentCache.services = list;
}

$('#addServiceBtn').addEventListener('click', () => {
  $('#serviceFormCard').style.display = 'block';
  $('#serviceFormTitle').textContent = 'Add Service';
  $('#svc_id').value = '';
  $('#serviceForm').reset();
  $('#svc_published').checked = true;
});
$('#cancelServiceBtn').addEventListener('click', () => { $('#serviceFormCard').style.display = 'none'; });

window.editService = async (id) => {
  const s = (contentCache.services || []).find((x) => x.id === id);
  if (!s) return;
  $('#serviceFormCard').style.display = 'block';
  $('#serviceFormTitle').textContent = 'Edit Service';
  $('#svc_id').value = s.id;
  $('#svc_title').value = s.title;
  $('#svc_description').value = s.description || '';
  $('#svc_price').value = s.price;
  $('#svc_priceUnit').value = s.priceUnit || 'per video';
  $('#svc_icon').value = s.icon || '';
  $('#svc_published').checked = s.published !== false;
};

window.deleteService = async (id) => {
  if (!confirm('Delete this service?')) return;
  await api('/api/admin/services/' + id, { method: 'DELETE' });
  showStatus('Service deleted.');
  loadServices();
};

$('#serviceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#svc_id').value;
  const body = {
    title: $('#svc_title').value,
    description: $('#svc_description').value,
    price: Number($('#svc_price').value) || 0,
    priceUnit: $('#svc_priceUnit').value,
    icon: $('#svc_icon').value,
    published: $('#svc_published').checked
  };
  try {
    if (id) await api('/api/admin/services/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/services', { method: 'POST', body: JSON.stringify(body) });
    showStatus('Service saved.');
    $('#serviceFormCard').style.display = 'none';
    loadServices();
  } catch (err) { showStatus(err.message, 'error'); }
});

// Projects
async function loadProjects() {
  const list = await api('/api/admin/projects');
  const tbody = $('#projectsTable');
  tbody.innerHTML = list.map((p) => `
    <tr>
      <td>${esc(p.title)}</td>
      <td>${esc(p.categoryLabel || p.category)}</td>
      <td>${p.featured ? 'Yes' : 'No'}</td>
      <td>${p.published ? 'Yes' : 'No'}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editProject('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No projects yet.</td></tr>';
  contentCache.projects = list;
}

$('#addProjectBtn').addEventListener('click', () => {
  $('#projectFormCard').style.display = 'block';
  $('#projectFormTitle').textContent = 'Add Project';
  $('#proj_id').value = '';
  $('#projectForm').reset();
  $('#proj_published').checked = true;
});
$('#cancelProjectBtn').addEventListener('click', () => { $('#projectFormCard').style.display = 'none'; });

window.editProject = (id) => {
  const p = (contentCache.projects || []).find((x) => x.id === id);
  if (!p) return;
  $('#projectFormCard').style.display = 'block';
  $('#projectFormTitle').textContent = 'Edit Project';
  $('#proj_id').value = p.id;
  $('#proj_title').value = p.title;
  $('#proj_description').value = p.description || '';
  $('#proj_category').value = p.category || 'youtube-long';
  $('#proj_thumbnail').value = p.thumbnail || '';
  $('#proj_featured').checked = !!p.featured;
  $('#proj_published').checked = p.published !== false;
};

window.deleteProject = async (id) => {
  if (!confirm('Delete this project?')) return;
  await api('/api/admin/projects/' + id, { method: 'DELETE' });
  showStatus('Project deleted.');
  loadProjects();
};

$('#projectForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#proj_id').value;
  const cat = $('#proj_category');
  const body = {
    title: $('#proj_title').value,
    description: $('#proj_description').value,
    category: cat.value,
    categoryLabel: cat.options[cat.selectedIndex].text,
    thumbnail: $('#proj_thumbnail').value,
    featured: $('#proj_featured').checked,
    published: $('#proj_published').checked
  };
  try {
    if (id) await api('/api/admin/projects/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/projects', { method: 'POST', body: JSON.stringify(body) });
    showStatus('Project saved.');
    $('#projectFormCard').style.display = 'none';
    loadProjects();
  } catch (err) { showStatus(err.message, 'error'); }
});

// Achievements
async function loadAchievements() {
  const list = await api('/api/admin/achievements');
  const tbody = $('#achTable');
  tbody.innerHTML = list.map((a) => `
    <tr>
      <td>${esc(a.name)}</td>
      <td>${esc(a.year)}</td>
      <td>${esc(a.organization)}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editAch('${a.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAch('${a.id}')">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4">No achievements yet. Add your real awards here.</td></tr>';
  contentCache.achievements = list;
}

$('#addAchBtn').addEventListener('click', () => {
  $('#achFormCard').style.display = 'block';
  $('#ach_id').value = '';
  $('#achForm').reset();
});
$('#cancelAchBtn').addEventListener('click', () => { $('#achFormCard').style.display = 'none'; });

window.editAch = (id) => {
  const a = (contentCache.achievements || []).find((x) => x.id === id);
  if (!a) return;
  $('#achFormCard').style.display = 'block';
  $('#ach_id').value = a.id;
  $('#ach_name').value = a.name;
  $('#ach_year').value = a.year || '';
  $('#ach_organization').value = a.organization || '';
  $('#ach_description').value = a.description || '';
};

window.deleteAch = async (id) => {
  if (!confirm('Delete this achievement?')) return;
  await api('/api/admin/achievements/' + id, { method: 'DELETE' });
  showStatus('Deleted.');
  loadAchievements();
};

$('#achForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#ach_id').value;
  const body = {
    name: $('#ach_name').value,
    year: $('#ach_year').value,
    organization: $('#ach_organization').value,
    description: $('#ach_description').value
  };
  try {
    if (id) await api('/api/admin/achievements/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/achievements', { method: 'POST', body: JSON.stringify(body) });
    showStatus('Achievement saved.');
    $('#achFormCard').style.display = 'none';
    loadAchievements();
  } catch (err) { showStatus(err.message, 'error'); }
});

// Theme
$$('.theme-option').forEach((el) => {
  el.addEventListener('click', async () => {
    try {
      await api('/api/admin/theme', { method: 'PUT', body: JSON.stringify({ theme: el.dataset.theme }) });
      contentCache.theme = el.dataset.theme;
      $$('.theme-option').forEach((t) => t.classList.remove('active'));
      el.classList.add('active');
      showStatus('Theme updated to ' + el.dataset.theme);
    } catch (err) { showStatus(err.message, 'error'); }
  });
});

// Upload
$('#uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = $('#uploadFile').files[0];
  if (!file) return showStatus('Choose a file first.', 'error');
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    $('#uploadResult').innerHTML = `<p class="form-success" style="display:block;">Uploaded: <code>${data.url}</code><br><img src="${data.url}" style="max-width:200px;margin-top:0.5rem;border-radius:8px;" /></p>`;
    showStatus('Image uploaded.');
  } catch (err) { showStatus(err.message, 'error'); }
});

// Password
$('#passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cur = $('#curPass').value;
  const neu = $('#newPass').value;
  const conf = $('#confirmPass').value;
  if (neu !== conf) return showStatus('New passwords do not match.', 'error');
  try {
    await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: cur, newPassword: neu })
    });
    showStatus('Password changed successfully.');
    $('#mustChangeBanner').classList.remove('show');
    $('#passwordForm').reset();
  } catch (err) { showStatus(err.message, 'error'); }
});

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

init();
