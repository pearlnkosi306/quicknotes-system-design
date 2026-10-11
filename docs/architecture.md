# QuickNotes Architecture (1 million users)

## Requirements

**Functional:** sign up and log in; create, read, update and delete notes; tag notes and filter by tag; list notes with pagination.

**Non-functional:** availability 99.9%; p95 latency under 300 ms for reads; durable storage (no lost notes); scalable to 1M users; secure (HTTPS, hashed passwords); read-heavy workload.

## Load estimate

Assumptions: 1M users, 20% daily active (200,000 DAU); each active user does 50 reads and 5 writes per day; peak traffic is 5x average; a note is about 1 KB.

| Metric | Calculation | Result |
|---|---|---|
| Reads/day | 200,000 × 50 | 10M |
| Reads/second (avg) | 10M ÷ 86,400 | ~116 /s |
| Reads/second (peak) | 116 × 5 | ~580 /s |
| Writes/day | 200,000 × 5 | 1M |
| Writes/second (avg) | 1M ÷ 86,400 | ~12 /s |
| Writes/second (peak) | 12 × 5 | ~60 /s |
| Storage/year | 1M notes/day × 1 KB × 365 | ~365 GB |
| With indexes and tags (×2) | 365 GB × 2 | ~0.75 TB/year |

Reads are about 10x writes, so caching and read replicas pay off.

## Architecture diagram

```
 Client (browser/app)
   |        |            \
   v        v             v
  DNS      CDN        Load Balancer (x2)
(name->IP) (static)        |
                 +---------+---------+
                 v         v         v
              App 1      App 2     App 3  (stateless)
                 |         |         |
        +--------+---------+---------+
        | reads            | writes        | jobs
        v                  v               v
  Cache (Redis)      DB Primary         Queue
    | miss             |  replication      |
    v                  v                   v
  DB Replica <---------+               Worker --> DB Primary
```

## Why each component exists

- **Client:** the web or mobile app the user interacts with, which calls the REST API.
- **DNS:** turns `quicknotes.example` into the address of the CDN or load balancer, and can route around failed regions.
- **CDN:** serves static files (HTML, CSS, JS) from servers near the user so they load fast and our servers stay free for API work.
- **Load balancer:** spreads requests across app servers and removes unhealthy ones, so no single server is overloaded.
- **App servers (3):** run the API logic; being stateless, we add more as traffic grows.
- **Cache (Redis):** keeps recently read notes in memory so most reads never touch the database.
- **Primary database:** the single source of truth for all writes, with durable storage.
- **Read replica:** a live copy of the primary that handles cache-miss reads and takes over if the primary fails.
- **Queue:** holds background jobs so slow work does not delay the user's request.
- **Worker:** picks jobs from the queue (search indexing, email notifications, exports) and processes them asynchronously.

## Request flows

**GET /notes**
1. Client sends the request; DNS resolves to the load balancer.
2. Load balancer picks a healthy app server.
3. App server checks the token, then looks up `notes:{user}:page1` in the cache.
4. Cache hit: return the JSON immediately.
5. Cache miss: query the read replica, store the result in the cache (TTL 60 s), return the JSON.

**POST /notes**
1. Client sends the request; the load balancer forwards it to an app server.
2. App server validates the token and the input (title required, max 100 characters); invalid input returns 400.
3. App server inserts the note into the primary database.
4. App server deletes the user's cached note lists so the next read is fresh.
5. App server puts a job on the queue (for example "index this note") and returns `201 Created`.
6. The worker later takes the job and processes it without making the user wait.

## Trade-offs

1. **Cache vs. freshness:** caching makes reads fast but a note may look stale for a moment. We reduce this with a short TTL and by clearing the cache on writes.
2. **Replica vs. consistency:** replicas add read capacity, but replication lag can briefly show old data. We accept eventual consistency for lists and read from the primary right after a user's own write.
3. **Queue vs. simplicity:** asynchronous jobs keep requests fast but add another system to run and monitor. We accept it because background work must not block users.

## Avoiding single points of failure

- **DNS:** use a managed provider with multiple name servers.
- **Load balancer:** run two (active/standby or active/active).
- **App servers:** three or more, stateless, in different zones.
- **Cache:** Redis with a replica; if it fails, requests fall back to the database.
- **Database:** primary with a replica that can be promoted automatically, plus daily backups.
- **Queue and worker:** a durable queue and several workers; failed jobs are retried.
