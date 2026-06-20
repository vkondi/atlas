[⬅️ Back to Backend Engineering](../README.md)

# JWT Security & Best Practices

JSON Web Tokens (JWT) are a stateless, URL-safe binary container standard for transferring claims between two parties, commonly used for authorization.

---

## Why It Matters

Because JWTs are self-contained and signed, resource microservices can verify user permissions without querying a database or auth server, drastically reducing latency. However, statelessness introduces a critical trade-off: once issued, a JWT cannot be easily revoked. Furthermore, poor implementations—such as utilizing weak secret keys, accepting the `'none'` algorithm, or storing tokens in client-side storage vulnerable to scripting theft—expose systems to signature forgery and session hijacking.

---

## Anatomy of a JWT

A JWT consists of three parts separated by dots (`.`):

```
       [ Header ] . [ Payload ] . [ Signature ]
       - alg: RS256 - iss, exp,   - Hash verification
       - typ: JWT     sub, roles    cryptographically signed
```

1. **Header**: Declares the token type and the hashing algorithm used (e.g. `{ "alg": "RS256", "typ": "JWT" }`).
2. **Payload**: Contains the claims—statements about the user and token context:
   - `sub` (Subject): The user's ID.
   - `exp` (Expiration Time): Unix timestamp of token expiration. Must always be configured.
   - `jti` (JWT ID): A unique identifier for the token, useful for tracking and revocation checks.
3. **Signature**: Validates that the payload has not been modified. Created by taking the base64-encoded header and payload, hashing them using the specified algorithm, and encrypting with a secret key.

---

## Signing Algorithms: Symmetric vs. Asymmetric

Choosing the right signing scheme is critical for distributed system security:

| Algorithm                             | Hashing    | Key Management                                                                                                 | Security Bounds                                                                                                                                  |
| :------------------------------------ | :--------- | :------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **HS256** (HMAC + SHA256)             | Symmetric  | Single shared secret key is used to both sign and verify the token.                                            | Every service that verifies the token must hold the secret. If one microservice is compromised, hackers can forge valid tokens for all services. |
| **RS256** (RSA + SHA256) or **ES256** | Asymmetric | Public/Private key pair. The Auth server signs with the private key; microservices verify with the public key. | Highly secure. Microservices only hold the public key, meaning a compromise of a client service does not allow forging tokens.                   |

---

## Key Exploits & Defensive Mitigations

### 1. The `'none'` Algorithm Exploit

In early JWT libraries, setting the header to `{ "alg": "none" }` told the library to skip signature validation. Attackers could modify their payload (e.g., changing their role to `admin`) and append a blank signature block, which the server accepted.

- **Mitigation**: Enforce validation rules that explicitly reject tokens with `alg: "none"`, and always declare allowed algorithms in the verify function:

```javascript
// Secure verification configuration
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### 2. Client-Side Token Storage Vulnerability

Storing JWTs in `localStorage` makes them accessible to malicious scripts via Cross-Site Scripting (XSS).

- **Mitigation**: Keep JWT access tokens in application memory (short-lived variables). Issue refresh tokens inside an `HttpOnly`, `Secure`, `SameSite=Lax` cookie scoped to a `/refresh` API endpoint, which exchanges the cookie for a new short-lived memory access token.

### 3. Stateless Revocation (The Blacklist Pattern)

If a user changes their password or logs out, their active JWT remains valid until the `exp` timestamp passes.

- **Mitigation**: Enforce short access token life (e.g., 15 minutes). When a logout occurs, store the token's `jti` ID in a **Redis Blacklist** with an expiration matching the token's remaining TTL. The API gateway checks this fast memory blacklist during incoming requests.

---

## Real-World Production Learnings

In our early SaaS platform, we utilized symmetric HS256 encryption, sharing the HMAC secret key across 8 internal microservices. During a routine repository security audit, we discovered that a junior developer had committed a debugging logger script containing the raw HMAC secret string to a private git repository.

Although the repository was private, sharing a single symmetric master key created a single point of failure: if any repository was leaked, an attacker could forge administrative tokens.

We migrated the ecosystem to **Asymmetric RS256 signing**:

1. We generated a 2048-bit RSA key pair. We stored the private key exclusively in our secure central Authentication service.
2. We published the public key in a JSON Web Key Set (JWKS) format at a public endpoint:
   `https://auth.example.com/.well-known/jwks.json`
3. We updated our microservices to fetch and cache the public key dynamically from the JWKS endpoint using libraries like `jwks-rsa`.

This transition ensured that only our central auth service could generate tokens, while other microservices could easily download public keys to verify signatures safely, removing the risk of key leak from codebase commits.

---

## Related Reading

- [Authentication & Authorization Basics](./basics.md)
- [Session Management](./session-management.md)
- [OAuth 2.0 and OIDC](./oauth2-and-oidc.md)
- [Ref: Authentication Tokens Your Digital VIP Pass](../../../blogs/Authentication_Tokens_Your_Digital_VIP_Pass.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.authentication-and-authorization.jwt-security.md)
