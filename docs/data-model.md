# QuickNotes Data Model

## Entities

**users**: `id` BIGINT **PK**, `email` VARCHAR(255) UNIQUE NOT NULL, `password_hash` VARCHAR(255) NOT NULL, `created_at` TIMESTAMPTZ

**notes**: `id` BIGINT **PK**, `user_id` BIGINT **FK → users.id**, `title` VARCHAR(100) NOT NULL, `body` TEXT, `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ

**tags**: `id` BIGINT **PK**, `user_id` BIGINT **FK → users.id**, `name` VARCHAR(50) NOT NULL (unique per user)

**note_tags**: `note_id` BIGINT **FK → notes.id**, `tag_id` BIGINT **FK → tags.id**; **PK (note_id, tag_id)**

## Relationships

- **One-to-many:** one user has many notes, and one user has many tags. Each note and tag has exactly one owner (`user_id`).
- **Many-to-many:** a note can have many tags and a tag can be on many notes. The join table `note_tags` links them, with one row per pairing.

## CREATE TABLE statements (PostgreSQL)

```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

## Example queries

```sql
-- 1. Latest 10 notes for a user (page 1)
SELECT id, title, body, created_at
FROM notes WHERE user_id = 42
ORDER BY created_at DESC LIMIT 10;

-- 2. JOIN: notes with a given tag
SELECT n.id, n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t ON t.id = nt.tag_id
WHERE n.user_id = 42 AND t.name = 'work';

-- 3. Number of notes per tag
SELECT t.name, COUNT(*) AS note_count
FROM tags t JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 42 GROUP BY t.name ORDER BY note_count DESC;
```

## Index

```sql
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
```
**Reason:** almost every request is "this user's newest notes". The index lets the database find them directly instead of scanning every note, which keeps `GET /notes` fast at millions of rows.

## SQL or NoSQL?

I chose **SQL (PostgreSQL)**. QuickNotes data is clearly structured and relational (users, notes, tags, and a many-to-many link), and we need integrity guarantees such as foreign keys and unique tags. At about 60 writes per second at peak, one primary with read replicas is more than enough, so we do not need NoSQL's horizontal write scaling. Joins for tag filtering are simple in SQL and awkward in most document stores.
