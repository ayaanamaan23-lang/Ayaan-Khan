# Security Specification & Threat Model

This document maps out our Attribute-Based Access Control (ABAC) and Zero-Trust model for the Firestore database.

## Data Invariants

1. **Self-Ownership Constraint**: A user can only create or update their own profile `/users/{userId}` where `{userId}` matches their authenticated Firebase UID (`request.auth.uid`).
2. **Access Safeguards**:
   - High-privileged administrative roles are blocked by default.
   - Profile deletions are forbidden from the client SDK (delete is disabled).
   - Wildcard reads are locked with strict individual constraints.

## The Dirty Dozen (Threat Vectors)

1. **Identity Theft**: Attempting to create user `/users/attacker` using UID `victim`.
2. **Key Poisoning**: Injecting invalid metadata fields (`role: "admin"`) on registration.
3. **Ghost Writes**: Passing oversized usernames (10MB strings).
4. **Relational Spoofing**: Matching uid in body while bypassing auth validation.
5. **Session Interception**: Writing without a valid signature `request.auth != null`.
6. **Immutable Tampering**: Direct mutation of registration timestamp `createdAt`.
7. **Client Overwrites**: Attempting to set system variables.
8. **Malicious ID Injection**: Passing path parameters with binary or unsafe escape characters.
9. **Rogue Query scraping**: Collection-wide sweeps of other user profiles.
10. **Bypassed Key Limits**: Supplying fewer or more fields than expected in the profile.
11. **Rogue Deletes**: Deleting account profiles through Firestore client SDK.
12. **Unverified Account Access**: Accessing databases with an unverified email token.

## Rules Validation Target
These threat vectors are programmatically neutralized in `firestore.rules`.
