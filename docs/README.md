# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two parts: a small front-end API client that proves the browser can talk to an API (using the JSONPlaceholder practice API), and design documents for the real backend.

## How to run the API client

1. Clone the repository: `git clone https://github.com/your-username/quicknotes-system-design.git`
2. Open the folder and double-click `index.html` (or use the VS Code "Live Server" extension).
3. Click **Load notes** to fetch 10 notes, use the form to add a note, and click **Delete** on a note to remove it.

Files: `index.html`, `api.js`, `style.css`. JSONPlaceholder does not really store created notes, so notes you create are removed locally only (explained in a comment in `api.js`).

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- How to use `fetch` with `async/await`, check `response.ok`, and handle errors with `try / catch / finally`.
- Good interfaces show loading, success, error and empty states, validate input, and disable buttons during requests.
- A REST API needs clear endpoints, correct status codes and error bodies before the backend is built.
- Many-to-many relationships need a join table, and indexes should match the most common query.
- Estimating load (reads/s, writes/s, storage) shows why we need caching, read replicas and queues, and every component should remove a single point of failure.
