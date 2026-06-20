[⬅️ Back to Security](../README.md)

# Application Security Basics

An operational guide to application-level security principles, implementing the Principle of Least Privilege, design-in-depth architectural models, and configuring secure container runtimes.

---

## Why It Matters

Traditional perimeter security—such as firewalls, intrusion detection systems, and network gateways—is no longer sufficient to protect modern systems. If an attacker exploits a code-level vulnerability (such as a deserialization flaw or remote code execution loophole), they bypass perimeter network checks completely.

Application security focuses on securing the code, dependencies, and container runtimes. Securing systems from within requires assuming that the perimeter will eventually be breached. Implementing multi-layered defense schemes and restricting application runtime privileges prevents a local code injection from escalating into a full system compromise.

---

## Core Concepts

### 1. The Principle of Least Privilege (PoLP)

PoLP dictates that any system process, user, or container should only possess the minimum privileges necessary to execute its designated task.

- **Container Execution**: Never run application processes inside container runtimes as the `root` user (UID 0). If a process is compromised, the attacker inherits root access to the container namespace.
- **Storage Access**: Make container root filesystems read-only. Temporary files should be directed to ephemeral, memory-backed `tmpfs` mounts.
- **Network Isolation**: Prevent backend runtimes from initiating arbitrary outgoing connections to the internet, blocking reverse shells.

### 2. Defense in Depth

Defense in Depth is an architectural model that implements multiple overlapping security layers:

```
                      +-----------------------------+
                      |     1. EDGE LAYER (WAF)     |
                      +-----------------------------+
                                     |
                      +-----------------------------+
                      |   2. CONTROLLER (Validation)|
                      +-----------------------------+
                                     |
                      +-----------------------------+
                      |   3. RUNTIME (Least Priv)   |
                      +-----------------------------+
                                     |
                      +-----------------------------+
                      |  4. DATABASE (Param/RBAC)   |
                      +-----------------------------+
```

If a vulnerability bypasses the Web Application Firewall (WAF), input validation logic at the controller layer catches the exploit. If input validation fails, database parameterized queries prevent database access, and a restricted execution sandbox prevents server hijack.

### 3. Secure-by-Default Architectures

Modern frameworks should prevent common vulnerabilities out of the box:

1. **Auto-Escaping Views**: Frontend frameworks like React escape dynamic strings by default, preventing Cross-Site Scripting (XSS) unless explicitly overridden (e.g., `dangerouslySetInnerHTML`).
1. **ORM Parameters**: Modern Object-Relational Mappers (ORMs) parameterize SQL queries automatically, preventing SQL injection by separating code from data.
1. **Typesafe Sanitization**: Use schemas (such as Zod or Ajv) to parse and sanitize request inputs before they reach database controllers.

---

## Real-World Production Learnings

We operated a document rendering service that accepted uploaded images, resized them using an external system utility (`graphicsmagick`), and stored metadata in a database.

**The Failure**:
An attacker uploaded a file containing shell meta-characters as part of the filename. Because the service ran inside the Docker container as `root`, the backend utility executed the filename within a shell process. The attacker successfully initiated a reverse shell connection, gaining root control over the container, and scanned our internal staging VPC.

**The Diagnostic**:

1. **Running as Root**: The container lacked a non-privileged user definition, executing all server operations as `root` (UID 0).
2. **Missing Defense in Depth**: Input validation was handled solely on the client-side. The backend did not check or sanitize file names.
3. **Shell Execution Pattern**: The code invoked shell execution commands:
   ```javascript
   // Vulnerable Pattern: Command Injection via shell expansion
   exec(`gm convert ${userFilename} output.jpg`);
   ```

**The Refactor**:
We restructured the service to run under a non-privileged user space, configured a read-only container environment, and removed shell executions:

1. **Non-Root Execution**: Defined a non-privileged `node` user in the Dockerfile.
2. **Read-Only Container Mounts**: Configured the container root directory to be read-only, using an ephemeral local `tmpfs` volume for processing images.
3. **Switched to ExecFile**: Replaced `exec` (which spawns a system shell) with `execFile` (which runs binaries directly without shell expansions).

Here is the hardened container configuration and controller implementation:

```dockerfile
# Hardened Dockerfile
FROM node:20-alpine

# Set secure run permissions
WORKDIR /usr/src/app

# Copy dependency structures
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Switch to the default non-root node user provided by the alpine image
USER node

EXPOSE 3000
CMD ["node", "server.js"]
```

Here is the secure controller implementation:

```typescript
// src/controllers/image-processor.ts
import { Request, Response } from 'express';
import { execFile } from 'child_process';
import path from 'path';

export async function processImageUpload(req: Request, res: Response) {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  // 1. INPUT SANITIZATION: Validate file type and enforce clean naming
  const cleanExtension = path.extname(uploadedFile.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(cleanExtension)) {
    return res.status(400).json({ error: 'Invalid file extension.' });
  }

  // Override arbitrary user filename with a generated safe UUID
  const safeFilename = `${crypto.randomUUID()}${cleanExtension}`;
  const inputPath = path.join('/tmp/uploads', uploadedFile.filename);
  const outputPath = path.join('/tmp/processed', safeFilename);

  // 2. AVOID SHELL EXECUTION: execFile passes parameters as array elements,
  // preventing shell redirection exploits (like injecting ';' or '&&')
  execFile(
    'gm',
    ['convert', inputPath, '-resize', '800x600', outputPath],
    (error, stdout, stderr) => {
      if (error) {
        console.error('Image processing failure:', stderr);
        return res.status(500).json({ error: 'Image processing failed.' });
      }

      res.status(200).json({
        status: 'processed',
        filename: safeFilename,
      });
    },
  );
}
```

By switching to this architecture:

- Spawning shell commands from user inputs was completely blocked by parameterizing inputs inside `execFile`.
- Even if an execution vulnerability was found, the attacker was isolated inside a non-privileged container environment without root access or host namespace controls.
- The read-only root filesystem prevented attackers from persisting malicious binaries inside container assets.

---

## Related Reading

- [Dependency Vulnerability Management](./dependency-vulnerability-management.md)
- [OWASP Top 10 Remediation](./owasp-top-ten-remediation.md)
- [XSS & CSRF Protection](./xss-and-csrf-protection.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.application-security.basics.md)
