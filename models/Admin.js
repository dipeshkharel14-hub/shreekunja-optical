/**
 * models/Admin.js
 *
 * Query layer for the `admins` table.
 *
 * Business rule: there are EXACTLY three admin accounts (MAX_ADMINS).
 * There is deliberately no delete function and no role-change function.
 *
 * NOTE: the top half of this file (findById ... createAdmin) was rebuilt —
 * the original was overwritten by routes/admin.js when the project was
 * flattened into one folder. The login-tracking functions below
 * (recordSuccessfulLogin onward) are the original code that survived.
 */

const { query } = require('../config/database');

const MAX_ADMINS = 3;

async function findById(id) {
  const result = await query('SELECT * FROM admins WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByEmail(email) {
  const result = await query('SELECT * FROM admins WHERE email = $1', [String(email).toLowerCase()]);
  return result.rows[0] || null;
}

async function count() {
  const result = await query('SELECT COUNT(*)::int AS n FROM admins');
  return result.rows[0].n;
}

/** Never returns password_hash. */
async function listAll() {
  const result = await query(
    `SELECT id, name, email, role, active, last_login_at, created_at
       FROM admins
      ORDER BY created_at ASC`
  );
  return result.rows;
}

/**
 * Used only by seed/seed.js. Re-checks the cap itself so the limit holds
 * even if this is ever called from somewhere else.
 */
async function createAdmin({ name, email, passwordHash, role }) {
  if ((await count()) >= MAX_ADMINS) {
    throw new Error(`Cannot create admin: the maximum of ${MAX_ADMINS} admin accounts already exists.`);
  }
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    throw new Error(`Invalid admin role: ${role}`);
  }

  const result = await query(
    `INSERT INTO admins (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, active, created_at`,
    [name, email.toLowerCase(), passwordHash, role]
  );

  return result.rows[0];
}

async function recordSuccessfulLogin(id) {
  await query(
    `UPDATE admins
     SET last_login_at = now(), failed_login_count = 0, locked_until = NULL
     WHERE id = $1`,
    [id]
  );
}

async function recordFailedLogin(id, { lockThreshold = 5, lockMinutes = 15 } = {}) {
  const result = await query(
    `UPDATE admins
     SET failed_login_count = failed_login_count + 1
     WHERE id = $1
     RETURNING failed_login_count`,
    [id]
  );

  const failedCount = result.rows[0]?.failed_login_count || 0;

  if (failedCount >= lockThreshold) {
    await query(
      `UPDATE admins SET locked_until = now() + ($2 || ' minutes')::interval WHERE id = $1`,
      [id, String(lockMinutes)]
    );
  }

  return failedCount;
}

function isLocked(admin) {
  return Boolean(admin.locked_until && new Date(admin.locked_until) > new Date());
}

async function setActive(id, active) {
  const result = await query(
    `UPDATE admins SET active = $2, updated_at = now() WHERE id = $1
     RETURNING id, name, email, role, active`,
    [id, active]
  );
  return result.rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  await query(
    `UPDATE admins SET password_hash = $2, updated_at = now() WHERE id = $1`,
    [id, passwordHash]
  );
}

module.exports = {
  MAX_ADMINS,
  findById,
  findByEmail,
  count,
  listAll,
  createAdmin,
  recordSuccessfulLogin,
  recordFailedLogin,
  isLocked,
  setActive,
  updatePassword
};
