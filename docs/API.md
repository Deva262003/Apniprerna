# API Reference

Base URL: `/api/v1`

## Authentication

- `POST /auth/admin/login` - Admin login
- `GET /auth/admin/me` - Current admin profile
- `POST /auth/admin/logout` - Admin logout
- `POST /auth/parent/login` - Parent login (Parent Portal)
- `GET /auth/parent/me` - Current parent profile
- `POST /auth/parent/logout` - Parent logout
- `POST /auth/student/login` - Student login (extension)
- `GET /auth/student/session` - Validate session (extension)
- `POST /auth/student/logout` - Student logout (extension)

## Policies

- `GET /policies`
- `GET /policies/:id`
- `POST /policies`
- `PUT /policies/:id`
- `DELETE /policies/:id`
- `PATCH /policies/:id/toggle`

Example create payload:

```json
{
  "name": "Center Blocklist",
  "description": "Block gaming sites",
  "policyType": "blocklist",
  "scope": "center",
  "center": "CENTER_ID",
  "rules": {
    "blockedDomains": ["example.com"],
    "blockedPatterns": ["*game*"]
  },
  "priority": 2
}
```

## Admin Commands

- `POST /admin/commands` - Send command to extension
- `GET /admin/commands` - Command history (filters: `status`, `type`, `student`, `center`)
- `GET /admin/commands/:id` - Single command
- `POST /admin/commands/:id/execute` - Retry command

Example command payload:

```json
{
  "type": "FORCE_LOGOUT",
  "targetType": "student",
  "targetId": "STUDENT_ID"
}
```

## Extension Updates

- `GET /extension/updates.xml` - Chrome update manifest
- `GET /extension/crx/:version` - Download CRX
- `GET /extension/version` - Current version metadata

## Activity

- `POST /activity/batch` - Submit activity (extension)
- `POST /extension/check-url` - Real-time block check (extension)
- `POST /extension/heartbeat` - Heartbeat + command polling (extension)
- `GET /extension/blocklist` - Blocklist + policy rules
- `GET /extension/time-restrictions` - Time restriction policy
- `GET /activity` - Activity list (dashboard)
- `GET /activity/recent` - Recent entries (dashboard)
- `GET /activity/blocked` - Blocked attempts (dashboard)
- `GET /activity/stats` - Activity stats (dashboard, supports `websiteRankBy=visits|time`)

## Blocklist

- `GET /blocklist`
- `GET /blocklist/:id`
- `POST /blocklist`
- `PUT /blocklist/:id`
- `DELETE /blocklist/:id`
- `PATCH /blocklist/:id/toggle`
- `POST /blocklist/bulk`
- `GET /blocklist/stats/summary`

## Centers

- `GET /centers`
- `GET /centers/:id`
- `POST /centers`
- `PUT /centers/:id`
- `DELETE /centers/:id`
- `GET /centers/:id/stats`
- `GET /centers/:id/students`

## Students

- `GET /students`
- `GET /students/:id`
- `POST /students`
- `PUT /students/:id`
- `DELETE /students/:id`
- `POST /students/:id/reset-pin`
- `GET /students/:id/activity`
- `GET /students/:id/stats`

## Parents (Admin)

Parent accounts are created by POD Admin/Admin/Super Admin and are linked to one or more students.

- `GET /parents` - List parents (POD Admin is restricted to their own center)
- `GET /parents/:id` - Get parent detail
- `POST /parents` - Create parent (returns a temp password)
- `PUT /parents/:id` - Update parent (linked students, contact fields, active)
- `POST /parents/:id/reset-password` - Reset parent password (returns a new temp password)

Create parent payload example:

```json
{
  "name": "Parent Name",
  "parentIdType": "numeric",
  "parentId": "12345678",
  "students": ["STUDENT_OBJECT_ID"]
}
```

Notes:
- Numeric parent IDs must be exactly 8 digits.
- Alphanumeric parent IDs must be exactly 8 characters (A-Z, 0-9) and are case-insensitive.

## Parent Portal (Parent)

Parent portal endpoints are only accessible using a Parent JWT (from `POST /auth/parent/login`).

- `GET /parent/me` - Parent profile
- `POST /parent/me/change-password` - Change password (required on first login)
- `GET /parent/students` - List linked children
- `GET /parent/students/:id/stats` - Child usage stats (linked child only)
- `GET /parent/students/:id/activity` - Child activity history (linked child only)
- `POST /parent/students/:id/force-logout` - Force logout child (linked child only)
