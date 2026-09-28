# Developer Collaboration Platform Test Plan

## Setup

- Configure `server/.env` with a reachable `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and the active frontend `CLIENT_ORIGIN`.
- Configure `client/.env` with `VITE_API_URL=http://localhost:5001/api`.
- Start the API and Vite client. Confirm `GET /api/health/database` returns HTTP 200.
- Create three test users: project owner, project member, and non-member. Use an isolated project and delete test records after the run.
- For socket cases, log in two project members in separate browser sessions.

## Feature Matrix

| Feature | Normal case | Invalid input | Unauthorized access | Edge and error cases |
| --- | --- | --- | --- | --- |
| Authentication | Register, login, fetch `/api/auth/me`, logout, log in again | Missing fields, malformed email, password under 8 or over 72 UTF-8 bytes, duplicate email | Call `/me` without a token; use invalid, expired, or altered token | Ten-attempt auth limit; unavailable MongoDB; missing JWT secret; password never returned or stored in plain text |
| Projects | Create, list, read, update, and delete a project with start/end dates | Missing/invalid dates, end before start, invalid status, unsupported fields, malformed project ID | Non-member cannot list/read; non-owner cannot update/delete; client-supplied owner rejected | Owner is added to members; empty project list; existing projects without dates remain valid; date-only values persist across time zones |
| Members | Owner adds and removes an existing user | Missing/malformed user ID | Anonymous and non-owner requests rejected | Unknown user, duplicate member, owner self-removal, owner stays in member list |
| Invitations | Owner invites an existing account by email; recipient accepts or declines | Invalid email, unknown account, duplicate pending invite | Only owner can invite; only recipient can list/respond | Existing member cannot be invited; acceptance adds project membership and records activity; invitation notification links to inbox |
| Tasks | Member creates, lists, updates, and deletes tasks | Empty title, invalid status/priority/date/ID | Non-member cannot read or mutate; outsider cannot be assigned | Assignee must be a member; null assignee; completion transition; empty task list; removed assignee/member |
| Comments | Member creates, lists, edits, and deletes comments | Blank or overlong text, invalid IDs | Non-member denied; another member cannot edit/delete; owner/admin can moderate | Assigned-task comment notification; mention notification; deleted task/comment; HTML-like text renders as text |
| Notifications | Trigger member-added, assignment, comment, completion, and mention notifications; list and mark one/all read | Invalid notification ID | Another user's notification cannot be read/updated; endpoints require JWT | Offline notification appears after reload; unread count changes; self-notification is skipped; duplicate socket event is not double-counted |
| Activity | Trigger project/member/task/comment/file/GitHub actions and view the project feed | Malformed project ID | Anonymous and non-member feed requests rejected | Empty feed; deleted related task/file; populated actor remains safe |
| Collaborative editor | Create/open/edit/save/delete a file; second member sees live update and presence | Invalid path/name/language; content over 1 MB; invalid IDs | Unauthenticated socket rejected; non-member cannot access files or join room | Two users edit same file (last-write-wins only); disconnect updates presence; failed autosave is visible; duplicate path returns conflict |
| Real-time chat | Load history and send a message; other member receives it live | Empty or over-4000-character message; invalid project ID | Unauthenticated socket/history denied; non-member cannot join/send/read | Offline messages appear from history; disconnected sender sees failure; sender receives acknowledgement once |
| Direct messages | Search users, start a one-to-one conversation, load history, and send/receive live messages | Search under two characters; unknown recipient; empty or over-4000-character message | Search/history require JWT; users cannot message themselves; sockets must join a valid user conversation | No conversations shows an empty state; project-room history never appears in DMs; disconnected sends show an error |
| GitHub | Owner connects a public `owner/repo`; members see metadata and commits | Malformed repository name | Non-owner cannot connect; non-member cannot read | Missing/private repository, invalid token, API outage, timeout, and rate limit produce useful errors; no token is exposed to the client |
| Dashboard | Counts, recent projects, and tasks reflect API data | N/A (read-only view) | Protected route redirects without login | No projects/tasks, API unavailable, retry, expired token redirects to login |
| Calendar | Show owned projects across their date ranges; click a project; edit its end date | Invalid end date or end date before project start | Only the signed-in user's own projects appear; updates require project ownership | Empty project list stays empty; saving updates MongoDB and the visible range; API failure restores the prior end date |
| Project workspace | Overview, task board, members, Code, Chat, GitHub, and Activity tabs render | Invalid project ID | Project APIs enforce membership and owner rules | Empty tabs/data, loading/error states, mobile navigation and narrow viewport layout |

## Current Automated Checks

- Frontend production build: `npm --prefix client run build`.
- Backend syntax checks: `node --check` on changed server modules.
- Live smoke checks: health/readiness, auth validation and rate-limit behavior, protected endpoint guards, and feature-specific temporary records against Atlas.
- Run integration checks against a disposable database or remove all generated test fixtures afterward.

## Known Scope Notes

- The collaborative editor uses basic last-write-wins updates; it is not conflict-free.
- JWT is held in browser `sessionStorage`; an HttpOnly cookie/CSRF migration remains a security hardening option.
- GitHub token is optional and must stay in the server environment only.