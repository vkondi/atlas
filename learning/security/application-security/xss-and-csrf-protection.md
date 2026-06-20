[⬅️ Back to Security](../README.md)

# XSS & CSRF Remediations

An operational guide to securing browser-based clients from Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF), configuring Content Security Policies (CSP), and implementing secure cookie architectures.

---

## Why It Matters

Browser execution sandboxes are vulnerable to credential theft and session hijacking. If an application fails to sanitize dynamic inputs, attackers can inject malicious JavaScript that runs in the context of the user's browser, exposing session tokens stored in memory or client-side storage.

Similarly, because browsers automatically attach active cookies to outgoing cross-site HTTP requests, applications are susceptible to CSRF. An attacker can trick an authenticated user's browser into executing unauthorized, state-changing requests (like modifying password emails or transferring funds) on a target site. Securing applications requires enforcing strict cookie configurations, sanitizing markup inputs, and establishing robust Content Security Policies.

---

## Core Concepts

### 1. Cross-Site Scripting (XSS)

XSS occurs when an application includes untrusted data in a web page without proper validation or escaping:

- **Stored XSS**: Malicious scripts are permanently stored on the target server (e.g., in a comments database) and executed when other users view the compromised page.
- **Reflected XSS**: The payload is embedded in a request URL (e.g., search parameters) and reflected back by the server, executing immediately in the victim's browser.
- **DOM-Based XSS**: The vulnerability exists entirely in client-side script templates that read input variables and write them directly to raw DOM write methods (like `innerHTML`).

**Remediation**:

1. **Contextual Encoding**: HTML entity encode, attribute encode, or JavaScript encode inputs based on where they are injected in the document.
1. **HTML Sanitization**: Use vetted sanitization libraries (e.g., `isomorphic-dompurify`) when rendering rich text, stripping script elements and event handler attributes (like `onload` or `onerror`).
1. **Content Security Policy (CSP)**: Configure HTTP headers that restrict the sources from which scripts can be loaded and executed, neutralizing injected inline scripts.

### 2. Cross-Site Request Forgery (CSRF)

CSRF abuses the browser's default behavior of transmitting session cookies with every request, even when initiated from a third-party site.

**Remediation**:

1. **SameSite Cookie Attributes**: Enforce `SameSite=Lax` or `SameSite=Strict`. This instructs the browser to restrict cookies from being transmitted during cross-site requests.
1. **Anti-CSRF Tokens**: Implement the Synchronizer Token or Double Submit Cookie pattern. The server validates a unique, cryptographically signed token passed in request headers, which cross-site scripts cannot access due to the Same Origin Policy.

---

## Real-World Production Learnings

We operated a collaborative project management portal where users logged in, updated task descriptions using a markdown editor, and submitted account profile updates.

**The Failure**:
An attacker submitted a task description containing a malicious image tag payload. When project administrators opened the task page, their browsers executed the inline script, sending their session JWTs directly to the attacker.

Additionally, because we stored session cookies without SameSite attributes, an attacker hosted a page that automatically triggered a form submission to `POST /api/v1/user/profile`, changing the victim's email address to the attacker's email, hijacking their account.

**The Diagnostic**:

1. **Bypassed Escaping**: To render markdown, the frontend bypassed standard React escaping, rendering raw text via an unvetted HTML converter, leading to Stored XSS.
2. **Plaintext LocalStorage Storage**: JWTs were stored in `localStorage`. JavaScript can read `localStorage` values, meaning XSS scripts could steal the tokens instantly.
3. **No Cross-Origin CSRF Shields**: Profile updates accepted cookie-based sessions without validating custom headers or verifying SameSite restrictions.

**The Refactor**:
We re-architected client token storage, implemented strict input sanitization, enabled security headers, and configured anti-CSRF token verification:

1. **HttpOnly Cookie Storage**: Migrated JWT storage from `localStorage` to `HttpOnly`, `Secure`, `SameSite=Lax` cookies, preventing client-side scripts from reading the token.
2. **DOM-Purify Sanitization**: Cleaned all user-generated HTML dynamically before rendering.
3. **Helmet CSP Headers**: Configured Helmet to restrict script loads.
4. **Anti-CSRF Header Check**: Configured anti-CSRF verification middleware.

Here is the secure express configuration and validation pipeline:

```typescript
// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';

const app = express();

app.use(express.json());
app.use(cookieParser('cookie_signing_secret'));

// 1. CONFIGURE SECURITY HEADERS & CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Only permit scripts loaded from our own domain
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
        // Block external script connections (reverse shells / exfiltration endpoints)
        connectSrc: ["'self'"],
      },
    },
  }),
);

// 2. ANTI-CSRF DOUBLE SUBMIT COOKIE MIDDLEWARE
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Safe methods do not require CSRF validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfCookie = req.cookies['XSRF-TOKEN'];
  const csrfHeader = req.headers['x-xsrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'CSRF token validation failed.' });
  }

  next();
}

// Apply validation to state-changing API endpoints
app.use(validateCsrfToken);

// 3. SECURE COOKIE TRANSMISSION & PROFILE ENDPOINT
app.post('/api/v1/user/profile', (req: Request, res: Response) => {
  const { displayName, bio } = req.body;

  // XSS Defense: Sanitize any rich text output using DOMPurify
  const cleanBio = DOMPurify.sanitize(bio);

  // Set session cookie with strict security flags
  res.cookie('SESSION_ID', 'jwt_session_token_value', {
    httpOnly: true, // Prevents client-side scripts from reading the cookie
    secure: true, // Forces HTTPS transmission only
    sameSite: 'lax', // Blocks cross-site automated submissions
    path: '/',
  });

  res.status(200).json({
    status: 'success',
    data: {
      displayName: DOMPurify.sanitize(displayName),
      bio: cleanBio,
    },
  });
});
```

By switching to this configuration:

- Inline scripts injected via XSS fail to execute because the browser blocks them under the CSP directives.
- Even if an XSS attack occurs, the JWT cannot be stolen because it is stored in an `HttpOnly` cookie, which JavaScript cannot access.
- CSRF attacks fail because the browser blocks session cookies from cross-site requests using `SameSite=Lax`, and the server rejects requests that lack the matching custom `X-XSRF-Token` header.

---

## Related Reading

- [Application Security Basics](./basics.md)
- [OWASP Top 10 Remediation](./owasp-top-ten-remediation.md)
- [github-repo-hardening.md](../infrastructure-security/github-repo-hardening.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.application-security.xss-and-csrf-protection.md)
