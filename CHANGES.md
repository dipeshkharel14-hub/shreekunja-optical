# What was changed when arranging this project

## Folder structure
All 60+ files were in one folder. They were moved into config/, routes/, controllers/,
middleware/, models/, services/, utils/, migrations/, seed/ and public/ exactly as the README describes.
Renamed to match the code that imports them: `Admin.js` -> routes/admin.js, `Blog.js` -> routes/blog.js,
`auth_1.js` -> routes/auth.js, `seed.js` -> seed/seed.js.

## Bugs fixed
- `models/Admin.js` and `models/Blog.js` did not exist. Their names collided with the route files, and the
  route files were saved over them (leftover model code was stuck on the end of routes/admin.js and
  routes/blog.js, which made both a syntax error). Route files were cleaned; both models were rebuilt
  from the surviving code plus how the controllers call them.
- controllers/authController.js had wrong imports (`./Admin`, `.AuditLog`, `./security`, ...).
- middleware/auth.js, middleware/errorHandler.js, utils/security.js, routes/me.js had imports that only
  worked when every file shared one folder.
- server.js guessed file locations at runtime; it would have mounted middleware/adminAuth.js as the
  `/api/admin` router once folders existed. It now uses plain requires.
- Blog.update() now only accepts a fixed list of columns (column names came straight from the request body).

## Vercel
- server.js exports the app and does not call listen() when running on Vercel.
- Added api/index.js, vercel.json, .vercelignore; DB pool limited to 3 connections per instance on Vercel.
- public/index.html and admin.html call `/api` on the same origin instead of the Render URL.
- package.json: engines.node >= 20.

## Security
- The uploaded `.env` contained what look like real secrets. It is NOT included here; a blank
  `.env.example` replaces it. Rotate those keys (see chat message).

## Removed
- fix-requires.js (one-off helper, no longer needed). public/images/IMG_20260608_131156.jpg is kept but
  is not referenced by any page (8 MB).
