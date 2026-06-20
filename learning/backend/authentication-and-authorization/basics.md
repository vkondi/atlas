[⬅️ Back to Backend Engineering](../README.md)

# Authentication & Authorization

Securing an application requires establishing trust (verifying identities) and enforcing access boundaries (evaluating permissions) across all system entry points.

---

## Why It Matters

Confusing authentication with authorization, or implementing poor password storage schemes (like using fast cryptographic hashes without salts), exposes backend systems to credential stuffing, rainbow table lookups, and privilege escalation exploits. Defensive software engineering requires treating identity validation as a multi-tier cryptographic pipeline.

---

## Authentication vs. Authorization

A secure backend must distinguish between these two core concerns:

```
                     Identity & Access Pipeline

      [ Input Credentials ] ---> 1. Authentication (AuthN)
                                    - "Who are you?"
                                    - Verify Password / Token / MFA
                                        |
                                        v
                                 [ Identity Verified ]
                                        |
                                        v
                                 2. Authorization (AuthZ)
                                    - "What can you do?"
                                    - Check Roles / Policies / ACLs
```

- **Authentication (AuthN)**: The process of verifying a client's identity (e.g. validating a password hash, a session token, or a multi-factor authentication code). _Analogy: A government passport confirms your identity._
- **Authorization (AuthZ)**: The process of verifying what actions an authenticated client is permitted to perform (e.g., checking if a user has an `Editor` role before allowing them to update an article). _Analogy: An airline boarding pass authorizes you to enter a specific flight._

---

## Password Hashing & Salt Cryptography

Storing passwords in plaintext is a critical security failure. Passwords must be hashed using slow, adaptive cryptographic algorithms:

### 1. The Hashing Mechanism

A cryptographic hash function is a one-way mathematical function that maps input strings of arbitrary length to a fixed-size binary output. It is computationally impossible to reverse the hash back to the original password.

### 2. Salting (Preventing Rainbow Tables)

A **Salt** is a unique, random string of bytes generated for each user and appended to the password _before_ hashing.

- **Benefit**: Salting ensures that two users with the identical password (e.g., `Password123`) will have completely different hashes in the database. This makes pre-computed hash lookup tables (Rainbow Tables) useless.

### 3. Adaptive Hashing Algorithms

Passwords must not be hashed with fast hashing algorithms like MD5, SHA-1, or SHA-256. These are designed to be fast for file verification, meaning a hacker's GPU array can test billions of combinations per second.

- **Argon2**: The industry standard (Winner of the Password Hashing Competition). Configured as **Argon2id**, it uses configurable memory cost, execution time, and CPU threads parameters to make offline brute-force cracking on GPU or ASIC hardware computationally expensive.
- **bcrypt**: An adaptive hashing algorithm based on the Blowfish cipher. It includes a work factor (cost) that increases the CPU cycles required to compute the hash, allowing developers to scale up hashing cost as server hardware speeds increase.

---

## Real-World Production Learnings

In an audit of an enterprise logistics application, we discovered the database stored user passwords using SHA-256 with a static application salt.

While the passwords were not plaintext, we realized that SHA-256 is built for speed. If a hacker leaked the database, a single mid-range consumer GPU could execute over 8 billion SHA-256 calculations per second, exposing standard user passwords within minutes using simple dictionary attacks.

We refactored our auth handler to migrate users to **Argon2id** dynamically on their next login:

1. When a user logged in, we first checked if their password hash used the legacy SHA-256 scheme.
2. If it did, we verified the credentials using the legacy SHA-256 code.
3. Upon successful validation, we took the plain password from the request body, hashed it using Argon2id (configured to consume 64MB of RAM per hash), saved the new hash, and updated the user's password schema flag to `argon2id`.

This gradual migration updated 90% of active accounts to a hardware-resistant hashing standard within two weeks without requiring a forced password reset, protecting our database against brute-force attacks.

---

## Related Reading

- [Session Management](./session-management.md)
- [JWT Security](./jwt-security.md)
- [OAuth 2.0 and OIDC](./oauth2-and-oidc.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.authentication-and-authorization.basics.md)
