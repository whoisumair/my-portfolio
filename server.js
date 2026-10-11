/**
 * Umair Portfolio — Secure Admin CMS Backend
 * Run: npm install && npm start
 * Then open http://localhost:3000
 */
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(ROOT, 'public', 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');

// Ensure directories
[DATA_DIR, UPLOADS_DIR].forEach((d) => {
  try {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  } catch (e) {
    // In serverless / read-only filesystem environments, directory creation may fail
  }
});

// ---------- Helpers ----------
function readJSON(file, fallback = {}) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('Read error', file, e.message);
  }
  return fallback;
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Write error', file, e.message);
    return false;
  }
}

function getContent() {
  return readJSON(CONTENT_FILE, {});
}

function saveContent(data) {
  data.updatedAt = new Date().toISOString();
  writeJSON(CONTENT_FILE, data);
}

// ---------- Middleware ----------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    name: 'umair.sid',
    secret: process.env.SESSION_SECRET || 'umair-portfolio-change-this-secret-in-production-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8 // 8 hours
    }
  })
);

// Static files (public site + uploads + admin assets)
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/images', express.static(path.join(ROOT, 'images')));
app.use('/css', express.static(path.join(ROOT, 'css')));
app.use('/js', express.static(path.join(ROOT, 'js')));
app.use('/admin/css', express.static(path.join(ROOT, 'admin', 'css')));
app.use('/admin/js', express.static(path.join(ROOT, 'admin', 'js')));

// Auth guard
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  return res.redirect('/admin/login.html');
}

// ---------- Auth Routes ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const users = readJSON(USERS_FILE, {});
  const user = users[username];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.user = {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    mustChangePassword: !!user.mustChangePassword
  };

  res.json({
    success: true,
    user: req.session.user,
    message: user.mustChangePassword
      ? 'Logged in. Please change the default password immediately.'
      : 'Logged in successfully.'
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('umair.sid');
    res.json({ success: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.session.user });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const users = readJSON(USERS_FILE, {});
  const user = users[req.session.user.username];
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 12);
  user.mustChangePassword = false;
  users[req.session.user.username] = user;
  writeJSON(USERS_FILE, users);

  req.session.user.mustChangePassword = false;
  res.json({ success: true, message: 'Password changed successfully.' });
});

// ---------- Public Content API (read-only) ----------
app.get('/api/public/content', (req, res) => {
  const content = getContent();
  // Never expose internal admin fields
  res.json({
    site: content.site,
    contact: content.contact,
    theme: content.theme || 'charcoal-orange',
    home: content.home,
    about: content.about,
    services: (content.services || []).filter((s) => s.published !== false).sort((a, b) => a.order - b.order),
    projects: (content.projects || []).filter((p) => p.published !== false).sort((a, b) => a.order - b.order),
    achievements: content.achievements || []
  });
});

// ---------- Protected Admin APIs ----------
app.get('/api/admin/content', requireAuth, (req, res) => {
  res.json(getContent());
});

app.put('/api/admin/content/:section', requireAuth, (req, res) => {
  const content = getContent();
  const section = req.params.section;
  if (!['site', 'contact', 'home', 'about', 'theme'].includes(section)) {
    return res.status(400).json({ error: 'Invalid section' });
  }
  content[section] = req.body;
  saveContent(content);
  res.json({ success: true, message: `${section} updated.`, data: content[section] });
});

// Services CRUD
app.get('/api/admin/services', requireAuth, (req, res) => {
  const content = getContent();
  res.json((content.services || []).sort((a, b) => a.order - b.order));
});

app.post('/api/admin/services', requireAuth, (req, res) => {
  const content = getContent();
  if (!content.services) content.services = [];
  const svc = {
    id: 'svc-' + uuidv4().slice(0, 8),
    title: req.body.title || 'New Service',
    description: req.body.description || '',
    price: Number(req.body.price) || 0,
    priceUnit: req.body.priceUnit || 'per video',
    icon: req.body.icon || 'fa-star',
    order: content.services.length + 1,
    published: req.body.published !== false
  };
  content.services.push(svc);
  saveContent(content);
  res.json({ success: true, service: svc });
});

app.put('/api/admin/services/:id', requireAuth, (req, res) => {
  const content = getContent();
  const idx = (content.services || []).findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Service not found' });
  content.services[idx] = { ...content.services[idx], ...req.body, id: req.params.id };
  saveContent(content);
  res.json({ success: true, service: content.services[idx] });
});

app.delete('/api/admin/services/:id', requireAuth, (req, res) => {
  const content = getContent();
  content.services = (content.services || []).filter((s) => s.id !== req.params.id);
  saveContent(content);
  res.json({ success: true });
});

// Projects CRUD
app.get('/api/admin/projects', requireAuth, (req, res) => {
  const content = getContent();
  res.json((content.projects || []).sort((a, b) => a.order - b.order));
});

app.post('/api/admin/projects', requireAuth, (req, res) => {
  const content = getContent();
  if (!content.projects) content.projects = [];
  const proj = {
    id: 'proj-' + uuidv4().slice(0, 8),
    title: req.body.title || 'New Project',
    description: req.body.description || '',
    category: req.body.category || 'youtube-long',
    categoryLabel: req.body.categoryLabel || 'YouTube Long Form',
    thumbnail: req.body.thumbnail || '/images/project1.jpg',
    order: content.projects.length + 1,
    published: req.body.published !== false,
    featured: !!req.body.featured
  };
  content.projects.push(proj);
  saveContent(content);
  res.json({ success: true, project: proj });
});

app.put('/api/admin/projects/:id', requireAuth, (req, res) => {
  const content = getContent();
  const idx = (content.projects || []).findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });
  content.projects[idx] = { ...content.projects[idx], ...req.body, id: req.params.id };
  saveContent(content);
  res.json({ success: true, project: content.projects[idx] });
});

app.delete('/api/admin/projects/:id', requireAuth, (req, res) => {
  const content = getContent();
  content.projects = (content.projects || []).filter((p) => p.id !== req.params.id);
  saveContent(content);
  res.json({ success: true });
});

// Achievements CRUD
app.get('/api/admin/achievements', requireAuth, (req, res) => {
  res.json(getContent().achievements || []);
});

app.post('/api/admin/achievements', requireAuth, (req, res) => {
  const content = getContent();
  if (!content.achievements) content.achievements = [];
  const item = {
    id: 'ach-' + uuidv4().slice(0, 8),
    name: req.body.name || 'Achievement',
    year: req.body.year || '',
    organization: req.body.organization || '',
    description: req.body.description || '',
    image: req.body.image || '',
    order: content.achievements.length + 1
  };
  content.achievements.push(item);
  saveContent(content);
  res.json({ success: true, achievement: item });
});

app.put('/api/admin/achievements/:id', requireAuth, (req, res) => {
  const content = getContent();
  const idx = (content.achievements || []).findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  content.achievements[idx] = { ...content.achievements[idx], ...req.body, id: req.params.id };
  saveContent(content);
  res.json({ success: true, achievement: content.achievements[idx] });
});

app.delete('/api/admin/achievements/:id', requireAuth, (req, res) => {
  const content = getContent();
  content.achievements = (content.achievements || []).filter((a) => a.id !== req.params.id);
  saveContent(content);
  res.json({ success: true });
});

// Theme
app.put('/api/admin/theme', requireAuth, (req, res) => {
  const content = getContent();
  const allowed = ['midnight-blue', 'charcoal-orange', 'slate-purple', 'emerald-dark'];
  if (!allowed.includes(req.body.theme)) {
    return res.status(400).json({ error: 'Invalid theme' });
  }
  content.theme = req.body.theme;
  saveContent(content);
  res.json({ success: true, theme: content.theme });
});

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = uuidv4() + ext;
    cb(null, safe);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
  }
});

app.post('/api/admin/upload', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = '/uploads/' + req.file.filename;
    res.json({ success: true, url, filename: req.file.filename });
  });
});

// ---------- Serve pages ----------
// Admin login (public)
app.get('/admin/login.html', (req, res) => {
  if (req.session.user) return res.redirect('/admin/');
  res.sendFile(path.join(ROOT, 'admin', 'login.html'));
});

// Admin dashboard (protected)
app.get('/admin/', requireAuth, (req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});
app.get('/admin/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});

// Public pages
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/portfolio.html', (req, res) => res.sendFile(path.join(ROOT, 'portfolio.html')));
app.get('/about.html', (req, res) => res.sendFile(path.join(ROOT, 'about.html')));
app.get('/services.html', (req, res) => res.sendFile(path.join(ROOT, 'services.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(ROOT, 'contact.html')));

// Fallback
app.use((req, res) => {
  res.status(404).send('Not found');
});

// ---------- Boot ----------
// Auto-seed if no users exist
if (!fs.existsSync(USERS_FILE) || !fs.existsSync(CONTENT_FILE)) {
  console.log('Seeding initial data...');
  try {
    require('./scripts/seed.js');
  } catch (err) {
    console.warn('Auto-seed skipped:', err.message);
  }
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n✓ Umair Portfolio CMS running at http://localhost:${PORT}`);
    console.log(`  Public site : http://localhost:${PORT}/`);
    console.log(`  Admin login : http://localhost:${PORT}/admin/login.html`);
    console.log(`  Default     : admin / Admin@123`);
    console.log(`  ⚠ Change the default password immediately after first login.\n`);
  });
}

module.exports = app;
