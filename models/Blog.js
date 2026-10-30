/**
 * models/Blog.js
 *
 * Query layer for the `blog_posts` table.
 *
 * NOTE: the top half (list/find functions) was rebuilt — the original was
 * overwritten by routes/blog.js when the project was flattened into one
 * folder. create/setPublished/remove are the original code that survived;
 * update() was hardened with a column whitelist.
 *
 * update() only accepts a fixed whitelist of columns. Column names are
 * interpolated into SQL, so they must never come straight from req.body.
 */

const { query } = require('../config/database');

// API field name (camelCase or snake_case)  ->  real column name
const FIELD_TO_COLUMN = {
  titleEn: 'title_en', title_en: 'title_en',
  titleNe: 'title_ne', title_ne: 'title_ne',
  slug: 'slug',
  excerptEn: 'excerpt_en', excerpt_en: 'excerpt_en',
  excerptNe: 'excerpt_ne', excerpt_ne: 'excerpt_ne',
  contentEn: 'content_en', content_en: 'content_en',
  contentNe: 'content_ne', content_ne: 'content_ne',
  coverImage: 'cover_image', cover_image: 'cover_image',
  category: 'category',
  tags: 'tags',
  author: 'author',
  seoTitle: 'seo_title', seo_title: 'seo_title',
  seoDescription: 'seo_description', seo_description: 'seo_description'
};

async function listPublished({ category = null, limit = 12, offset = 0 } = {}) {
  const result = await query(
    `SELECT id, title_en, title_ne, slug, excerpt_en, excerpt_ne, cover_image,
            category, tags, author, published_at
       FROM blog_posts
      WHERE published = true
        AND ($1::text IS NULL OR category = $1::text)
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT $2 OFFSET $3`,
    [category, limit, offset]
  );
  return result.rows;
}

/** Public lookup — only returns published posts. */
async function findBySlug(slug) {
  const result = await query(
    'SELECT * FROM blog_posts WHERE slug = $1 AND published = true',
    [slug]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query('SELECT * FROM blog_posts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listAllForAdmin() {
  const result = await query('SELECT * FROM blog_posts ORDER BY created_at DESC');
  return result.rows;
}

/** Original create(): supports publishing on creation. */
async function create(data) {
  const result = await query(
    `INSERT INTO blog_posts (
       title_en, title_ne, slug, excerpt_en, excerpt_ne, content_en, content_ne,
       cover_image, category, tags, author, seo_title, seo_description, published, published_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      data.titleEn, data.titleNe || null, data.slug, data.excerptEn || null, data.excerptNe || null,
      data.contentEn || null, data.contentNe || null, data.coverImage || null, data.category || null,
      data.tags || [], data.author || null, data.seoTitle || null, data.seoDescription || null,
      Boolean(data.published), data.published ? new Date() : null
    ]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const sets = [];
  const values = [];

  for (const [key, value] of Object.entries(fields || {})) {
    const column = FIELD_TO_COLUMN[key];
    if (!column) continue; // silently ignore unknown / disallowed fields
    values.push(value);
    sets.push(`${column} = $${values.length + 1}`);
  }

  if (sets.length === 0) return findById(id);

  const result = await query(
    `UPDATE blog_posts SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

async function setPublished(id, published) {
  const result = await query(
    `UPDATE blog_posts
        SET published = $2,
            published_at = CASE WHEN $2 THEN COALESCE(published_at, now()) ELSE published_at END,
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id, Boolean(published)]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  await query('DELETE FROM blog_posts WHERE id = $1', [id]);
}

module.exports = { listPublished, findBySlug, findById, listAllForAdmin, create, update, setPublished, remove };
