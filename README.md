# Umair Portfolio Website + Admin CMS

Premium cinematic portfolio for **Umair** (Video Editor, Graphic Designer & UI/UX Designer) with a secure, password-protected Admin Panel.

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Seed admin user + initial content (first time only)
npm run seed

# 3. Start the server
npm start
```

Then open:

- **Public site:** http://localhost:3000/
- **Admin login:** http://localhost:3000/admin/login.html

### Default Admin Credentials (testing only)

| Field    | Value     |
|----------|-----------|
| Username | `admin`   |
| Password | `Admin@123` |

**⚠ Change this password immediately** after first login (Account → Change Password). The system flags the default password until you change it.

## What the Admin Panel can do

- Secure login with bcrypt-hashed passwords + session cookies
- Edit Home page text (hero badge, title, tagline…)
- Manage Services (add / edit / delete / price / publish)
- Manage Portfolio projects (add / edit / delete / featured / publish / thumbnail)
- Edit About story and mission
- Manage Awards & Achievements
- Update Contact details & social links
- Upload images (JPG/PNG/WebP → `/uploads/`)
- Switch between 4 global color themes
- Change admin password

All changes are saved to `data/content.json` and `data/users.json` (persistent on disk).

## Project Structure

```
umair-portfolio/
├── server.js              # Express backend + API
├── scripts/seed.js        # Creates hashed admin + seed content
├── data/                  # Persistent JSON storage (created on seed)
├── public/uploads/        # Uploaded images
├── admin/                 # Admin UI (login + dashboard)
├── index.html … contact.html   # Public pages
├── css/  js/  images/     # Public assets
└── package.json
```

## Hosting Notes

This is a **Node.js** application. It is **not** a pure static site.

Recommended hosts:

- [Render](https://render.com) (Web Service)
- [Railway](https://railway.app)
- [Fly.io](https://fly.io)
- Any VPS (DigitalOcean, Linode, etc.) with Node 18+

On deploy:

1. Set environment variable `SESSION_SECRET` to a long random string.
2. Set `NODE_ENV=production`.
3. Ensure the `data/` and `public/uploads/` directories are persistent (volume or disk).
4. Run `npm install && npm run seed && npm start`.

For pure static hosting (Netlify/Vercel static) the Admin CMS will not work — you need a Node host.

### Vercel deployment

`vercel.json` routes requests to the Express API function, so the public site can be deployed on Vercel. The CMS is not production-persistent on Vercel as currently implemented: JSON data, uploaded files, and the default in-memory session store are local to function instances and may not persist or be shared between requests. Use durable external storage and a shared session store for the admin CMS, or deploy to a host with persistent storage.

## Security Checklist Before Going Public

- [ ] Change the default admin password
- [ ] Set a strong `SESSION_SECRET` environment variable
- [ ] Use HTTPS
- [ ] Keep dependencies updated
- [ ] Do not commit `data/users.json` with real passwords to public repos if you later change the hash strategy

## Public Pages

All previous pages are preserved:

| Page      | File            |
|-----------|-----------------|
| Home      | `index.html`    |
| Portfolio | `portfolio.html`|
| About     | `about.html`    |
| Services  | `services.html` |
| Contact   | `contact.html`  |

## Theme Notes

Themes are stored in the content database. Full CSS variable switching across every public page can be extended by reading `/api/public/content` and applying a `data-theme` attribute. The Admin already saves the selection.

## Support

Built as a practical, self-hosted CMS for a single-admin portfolio. For multi-user or enterprise needs, consider Payload CMS, Directus, or Strapi.
