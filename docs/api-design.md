# QuickNotes API Design

Base URL: `https://api.quicknotes.example/v1` · Format: JSON · Auth: `Authorization: Bearer <token>`

## Endpoints

| Method | Path | Description | Success |
|---|---|---|---|
| POST | /auth/login | Log in, receive a token | 200 OK |
| GET | /notes | List the user's notes (`?limit=10&page=1&tag=work`) | 200 OK |
| GET | /notes/{id} | Get one note | 200 OK |
| POST | /notes | Create a note | 201 Created |
| PUT | /notes/{id} | Replace a note | 200 OK |
| DELETE | /notes/{id} | Delete a note | 204 No Content |
| GET | /tags | List the user's tags | 200 OK |
| PUT | /notes/{id}/tags/{tagId} | Attach a tag to a note | 204 No Content |

## Examples

### Create a note: `POST /notes`

Request:
```json
{ "title": "Buy milk", "body": "2 litres, full cream", "tags": ["home"] }
```
Response `201 Created` (with `Location: /v1/notes/101`):
```json
{
  "id": 101,
  "title": "Buy milk",
  "body": "2 litres, full cream",
  "tags": ["home"],
  "created_at": "2026-10-11T09:30:00Z"
}
```

### List notes: `GET /notes?limit=2&page=1`

Response `200 OK`:
```json
{
  "data": [
    { "id": 101, "title": "Buy milk", "body": "2 litres, full cream", "tags": ["home"], "created_at": "2026-10-11T09:30:00Z" },
    { "id": 100, "title": "Call Sam", "body": "", "tags": [], "created_at": "2026-10-10T16:05:00Z" }
  ],
  "page": 1,
  "limit": 2,
  "total": 57
}
```

## Error codes

| Status | Meaning | When |
|---|---|---|
| 400 Bad Request | Invalid input | Missing title or title over 100 characters |
| 401 Unauthorized | Not authenticated | Missing or expired token |
| 403 Forbidden | Not allowed | Note belongs to another user |
| 404 Not Found | Does not exist | Unknown note id |
| 500 Internal Server Error | Server fault | Unexpected failure |

Example error body (`400`):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "title is required and must be at most 100 characters" } }
```
