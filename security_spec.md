# Firestore Security Specification — Pal Agency Command Center

## 1. Data Invariants
1. **Strict Ownership**: Every document in `leads`, `deliverables`, `calibration_rules`, and `execution_logs` must contain `ownerId == request.auth.uid`, and `request.auth.token.email_verified == true`.
2. **Valid Document IDs**: All single-document path IDs (`leadId`, `deliverableId`, `ruleId`, `logId`) must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
3. **Strict Schema & No Shadow Fields**: Every `create` checks `keys().hasAll(...) && keys().hasOnly(...)`. Every `update` validates the full incoming entity shape and restricts `affectedKeys().hasOnly(...)` to the exact action fields.
4. **Immutable Proof Records**: `deliverables` and `execution_logs` are immutable once created (`allow update: if false`).
5. **Terminal State Locking**: Once a lead reaches `approvalStatus == 'archived'`, no further updates are allowed.
6. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time`, and `createdAt` / `ownerId` are immutable after creation.
7. **PII Isolation**: `contactEmail` and `contactPhone` inside `leads` are readable only by the verified document owner (`isOwner(resource.data.ownerId)`).
8. **Bounded Arrays**: `outreachTouches` (max 3) and `stages` (max 12) are strictly bounded in size and first-element typed.

## 2. Dirty Dozen Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Create**: Creating `/leads/lead_1` with `auth == null`.
2. **Unverified Email Write**: Creating `/leads/lead_2` with `email_verified: false`.
3. **Identity Spoofing**: Creating `/leads/lead_3` with `ownerId: "victim_uid"` as `"attacker_uid"`.
4. **Shadow Field Injection**: Creating `/calibration_rules/rule_1` with extra field `isAdmin: true`.
5. **Blanket List Scraping**: Listing `/leads` without `where('ownerId', '==', auth.uid)`.
6. **Cross-Tenant PII Read**: Reading `/leads/lead_victim` belonging to another user.
7. **ID Poisoning**: Creating `/leads/../../bad!id` or a 300-char document ID.
8. **Timestamp Forgery**: Creating `/calibration_rules/rule_2` with client-forged `createdAt` != `request.time`.
9. **Immutable Field Tampering**: Updating `/leads/lead_1` to change `ownerId` or `createdAt`.
10. **Terminal State Bypass**: Updating a lead whose `existing().approvalStatus == 'archived'`.
11. **Proof Ledger Mutation**: Attempting `updateDoc` on `/execution_logs/log_1` or `/deliverables/del_1`.
12. **Denial-of-Wallet Oversized String / Unbounded Array**: Creating `/calibration_rules/rule_3` with a 5,000-char `ruleText` or `/execution_logs/log_2` with 100 `stages`.
