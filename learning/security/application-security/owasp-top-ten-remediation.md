[⬅️ Back to Security](../README.md)

# OWASP Top 10 Remediation

An operational remediation guide addressing critical web application vulnerabilities, detailing Broken Access Control mitigations, injection prevention, and secure authorization architectures.

---

## Why It Matters

The Open Web Application Security Project (OWASP) Top 10 tracks the most severe security risks to web applications globally. These vulnerabilities represent the primary access vectors used by attackers to exfiltrate database records, hijack user sessions, and deface systems.

Remediating these vulnerabilities requires adopting a secure-by-design mindset. Simply patching exploits reactively as they are discovered is insufficient. Developers must implement systemic code controls—such as automated query parameterization and contextual access validation middleware—to eliminate entire categories of vulnerability classes before they ever reach staging environments.

---

## Core Concepts

### 1. Broken Access Control (A01:2021)

Broken Access Control occurs when users execute actions outside their designated privileges. This takes two main forms:

- **Vertical Privilege Escalation**: A standard user accesses administrative routes or invokes functions reserved for privileged operations.
- **Horizontal Privilege Escalation (IDOR)**: A user accesses or modifies another user's private resources (e.g., invoices, profile data) by changing parameter IDs (e.g., querying `?id=1002` instead of their own `?id=1055`).

### 2. Injection Mitigation (A03:2021)

Injections occur when interpreter runtimes execute untrusted user input as code instructions. Remediating SQL, NoSQL, and Command Injections requires keeping data separate from execution commands:

1. **Avoid String Concatenation**: Never build query strings by combining variables directly (e.g., `SELECT * FROM users WHERE name = '${input}'`).
1. **Enforce Parameterization**: Use query parameters (`$1`, `$2`, or ORM-bindings). The database engine compiles the query structure first, treating the inputs strictly as data values, neutralizing injection payloads.
1. **Schema Validation**: Restrict inputs using strict types and schemas to filter out unexpected shell meta-characters.

---

## Real-World Production Learnings

We operated a SaaS business billing dashboard where users could retrieve PDF versions of their monthly subscription invoices using endpoints formatted as `GET /api/v1/invoices/:id`.

**The Failure**:
A competitor registered a free tier account and wrote a script that swept through invoice IDs from `10000` to `25000`. The script successfully downloaded over 15,000 PDF invoices containing private customer names, billing amounts, and corporate email addresses. Our router failed to confirm resource ownership before serving data.

**The Diagnostic**:

1. **Insecure Direct Object Reference (IDOR)**: The controller retrieved the invoice ID directly from the path parameter and queried the database without asserting ownership:
   ```javascript
   // Vulnerable Pattern: IDOR
   const invoice = await db.query('SELECT * FROM invoices WHERE id = $1', [
     req.params.id,
   ]);
   ```
2. **Implicit Trust**: The application assumed that users would only navigate using links rendered by the frontend UI, neglecting API-level validation.

**The Refactor**:
We refactored our endpoints to validate ownership at the database boundary, using the authenticated user context token:

1. **Scoped Database Queries**: Refactored database queries to filter both by the invoice ID and the authenticated user's organization identifier.
2. **Centralized Access Control Middleware**: Implemented Role-Based Access Control (RBAC) validations on administrative routes.

Here is the secure, parameterized controller implementation:

```typescript
// src/controllers/invoice-controller.ts
import { Request, Response } from 'express';
import { Pool } from 'pg';

const dbPool = new Pool();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: 'user' | 'admin';
  };
}

export async function getInvoiceDetails(
  req: AuthenticatedRequest,
  res: Response,
) {
  // 1. Validate parameter format before querying database
  const invoiceId = Number(req.params.id);
  if (isNaN(invoiceId)) {
    return res
      .status(400)
      .json({ error: 'Invalid invoice identifier format.' });
  }

  const userContext = req.user;
  if (!userContext) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    // 2. DEFENSE IN DEPTH: Scope query to organization boundaries
    // Parameterized parameters ($1, $2) prevent SQL injection.
    // organizationId filter prevents horizontal privilege escalation (IDOR).
    let queryText = `
      SELECT id, amount, status, organization_id, billing_date 
      FROM invoices 
      WHERE id = $1 AND organization_id = $2
    `;
    let queryParams: any[] = [invoiceId, userContext.organizationId];

    // 3. VERTICAL ISOLATION: Admins can bypass organization boundaries
    if (userContext.role === 'admin') {
      queryText = `
        SELECT id, amount, status, organization_id, billing_date 
        FROM invoices 
        WHERE id = $1
      `;
      queryParams = [invoiceId];
    }

    const result = await dbPool.query(queryText, queryParams);

    if (result.rows.length === 0) {
      // Return 404 instead of 403 to prevent resource enumeration scans
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Invoice retrieval failure:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
```

By switching to this architecture:

- Horizontal escalation (IDOR) attacks are blocked at the database query level, preventing users from accessing cross-tenant datasets.
- SQL injection attempts fail since variables are bound as data parameters ($1, $2) rather than compiled as executable instructions.
- Route enumeration is mitigated by returning consistent `404 Not Found` messages instead of descriptive `403 Forbidden` status codes when records exist under separate organizations.

---

## Related Reading

- [Application Security Basics](./basics.md)
- [XSS & CSRF Protection](./xss-and-csrf-protection.md)
- [dependency-vulnerability-management.md](./dependency-vulnerability-management.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.application-security.owasp-top-ten-remediation.md)
