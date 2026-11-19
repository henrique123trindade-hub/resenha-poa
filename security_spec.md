# Security Specification — ResenhaPOA

## 1. Data Invariants
1. **User Role Integrity**: A user cannot self-assign `role: "admin"` or escalate their role on `/users/{userId}` create or update. PII (`email`, `uid`) is readable only by the document owner or a verified admin.
2. **Event Approval Gate**: Non-admin organizers can create events only with `status` in `['draft', 'pending']`, `isVerified == false`, `isSponsored == false`, `isFeatured == false`, and `organizerId == request.auth.uid`. Only verified admins can publish, verify, sponsor, or feature an event.
3. **Venue Integrity**: Only admins can create, update, or delete `/venues/{venueId}` documents. Public reads are restricted to `status == 'published'`.
4. **Favorites Ownership**: A favorite document `/favorites/{favoriteId}` can only be read, created, or deleted by the owner (`userId == request.auth.uid`), with `favoriteId` validated as a safe ID.
5. **Poll Lists & Anti-Duplicate Vote Gate**: Anyone can read a specific `/pollLists/{listId}` by ID (shared link), but only the creator (`creatorId == request.auth.uid`) or admin can update/delete it. Votes in `/pollLists/{listId}/votes/{voteId}` require the parent list to exist and `isOpen == true`, and enforce `voteId == voterId` so a voter cannot flood multiple vote IDs per identity.
6. **Moderated Reviews**: Users can submit a review only with `status == 'pending'`, `authorId == request.auth.uid`, and integer rating `1..5`. Public readers see only `status == 'approved'`.
7. **Reports Isolation**: Any verified user can submit a report with `status == 'open'` and `reporterId == request.auth.uid`; only admins can read or resolve reports.
8. **Strict Timestamp & Payload Bounds**: Every string field enforces `.size()` limits, every ID enforces `^[a-zA-Z0-9_\-]+$`, and `createdAt`/`updatedAt` are validated against `request.time`.

## 2. Dirty Dozen Payloads (Attack Vectors Blocked)
1. **Self-Admin Escalation**: `POST /users/{uid}` with `{ role: "admin", ... }` -> `PERMISSION_DENIED`.
2. **PII Cross-User Read**: Signed-in User B reading `/users/{userA}` -> `PERMISSION_DENIED`.
3. **Auto-Publish Bypass**: Non-admin organizer creating `/events/{id}` with `{ status: "published", isVerified: true }` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Updating `/events/{id}` with `{ title: "New", isSponsored: true }` as non-admin -> `PERMISSION_DENIED`.
5. **Cross-Organizer Tampering**: Organizer B updating or deleting Organizer A's event -> `PERMISSION_DENIED`.
6. **Timestamp Forgery**: Creating `/events/{id}` with backdated `createdAt` != `request.time` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Writing `/events/../../../../etc/passwd` or 500-char ID -> `PERMISSION_DENIED`.
8. **1MB String Exhaustion**: Writing `/events/{id}` with 10,000-char `title` -> `PERMISSION_DENIED`.
9. **Favorite Spoofing**: User A creating `/favorites/{id}` with `userId: "userB"` -> `PERMISSION_DENIED`.
10. **Closed Poll Voting**: Casting a vote in `/pollLists/{listId}/votes/{voteId}` when parent `isOpen == false` -> `PERMISSION_DENIED`.
11. **Review Auto-Approval**: User creating `/venueReviews/{id}` with `status: "approved"` -> `PERMISSION_DENIED`.
12. **Blanket Report Scraping**: Non-admin listing `/reports` -> `PERMISSION_DENIED`.
