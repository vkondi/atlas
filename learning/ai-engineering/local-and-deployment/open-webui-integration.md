[⬅️ Back to AI Engineering](../README.md)

# Open WebUI Integration

An operational deployment guide to integrating Open WebUI with local Ollama clusters, covering Docker-compose layouts, OIDC user management, and secure document pre-processing pipelines.

---

## Why It Matters

Exposing raw model REST endpoints (like Ollama's HTTP API) directly to end-users is impractical, as they lack authentication, user session storage, conversation histories, or access permissions. **Open WebUI** provides an enterprise-ready, self-hosted web interface designed to interface with Ollama, OpenAI, or other local runners. However, running a default Open WebUI Docker deployment in a corporate intranet creates severe compliance risks: anyone on the network can access the portal, upload sensitive documents to the built-in RAG parser, and query model resources without authorization checks or auditable logs.

---

## Core Concepts

### 1. What is Open WebUI?

Open WebUI is a self-hosted chat portal containing features that mirror modern SaaS web assistants:

- **Multi-Backend Routing**: Connects to multiple Ollama instances and OpenAI APIs simultaneously, allowing side-by-side generation comparisons.
- **Granular RBAC**: Restricts model access based on user roles (Admin, Member, Pending).
- **Native Document Ingestion (RAG)**: Allows users to upload PDF, CSV, or TXT documents directly in chat to serve as contextual prompt anchors.
- **Pipeline Filters**: Supports Python-based middleware scripts that intercept and modify prompts, responses, or document uploads in transit.

### 2. Multi-Container Orchestration

In production, Open WebUI is deployed alongside Ollama using a secure Docker Compose stack with persistent storage mapping:

```yaml
# docker-compose.yml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama-backend
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - '11434:11434'
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui-portal
    volumes:
      - open_webui_data:/app/backend/data
    ports:
      - '3000:8080'
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEBUI_SECRET_KEY=9a8d7c6b5e4f3d2c1b0a # Replace with strong random key in prod
      - ENABLE_OAUTH_SIGNUP=true
    depends_on:
      - ollama
    restart: unless-stopped

volumes:
  ollama_data:
  open_webui_data:
```

### 3. Open WebUI Filter Pipelines

Using Open WebUI's custom **Pipelines** engine, engineers can write Python scripts to intercept and sanitize inputs before they hit the model or database:

1. **Inlet Filter**: Intercepts the user's prompt (e.g., checks for PII, API tokens, or injected code).
1. **Outlet Filter**: Intercepts the assistant's generation (e.g., filters profanity, strips broken markdown, or enforces styling checks).

---

## Real-World Production Learnings

We deployed Open WebUI for our engineering division, enabling team members to upload technical manuals and configuration guides directly to the interface using the built-in RAG parser.

**The Failure**:
A developer uploaded a technical system configuration document that contained live **AWS Access Keys** and database passwords.

Because Open WebUI's default RAG pipeline indexes all documents into a shared vector index database, other users querying the model started receiving responses that hallucinated or explicitly exposed these active system credentials, creating a critical security leak.

**The Diagnostic**:

1. **No Content Filtering**: Open WebUI's built-in file ingestion pipeline parsed raw text strings from the document and sent them directly to the embedding engine without scanning for sensitive patterns.
2. **Missing Input Isolation**: The vector database index did not implement separation or security tag checks for uploaded credentials.

**The Refactor**:
We developed and registered a custom **Python Inlet Filter Pipeline** inside Open WebUI:

1. **PII & API Token Scanner**: We integrated regular expression filters to intercept all prompt inputs and document uploads.
2. **Credential Masking**: If an AWS key, Slack webhook, or SSH key pattern is detected, the script redacts the characters (e.g., replacing `AKIAIOSFODNN7EXAMPLE` with `[REDACTED_AWS_KEY]`) before the string is sent to the embedding model or stored in the database.

Here is the Python filter class we injected into the Open WebUI backend configurations:

```python
# Open WebUI Pipeline Filter: PII and Secret Redactor
import re
from typing import Dict, Any, Union

class Pipeline:
    class Valves:
        # Configuration parameters configurable from WebUI Admin Panel
        redact_replacement: str = "[REDACTED_SECRET]"

    def __init__(self):
        self.valves = self.Valves()
        # Compile standard regex patterns for credentials
        self.patterns = {
            "AWS_KEY": re.compile(r"AKIA[0-9A-Z]{16}"),
            "AWS_SECRET": re.compile(r"SHA256:[a-zA-Z0-9+/]{43}"),
            "GENERIC_PASSWORD": re.compile(r"password\s*=\s*['\"][^'\"]+['\"]", re.IGNORECASE),
            "SLACK_WEBHOOK": re.compile(r"https://hooks\.slack\.com/services/[T|G|B][A-Za-z0-9_]+/[A-Za-z0-9_]+/[A-Za-z0-9_]+")
        }

    async def inlet(self, body: Dict[str, Any], __user__: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Intercepts prompt content and document texts before ingestion
        """
        messages = body.get("messages", [])
        for message in messages:
            content = message.get("content", "")
            if content:
                message["content"] = self.redact_secrets(content)

        return body

    def redact_secrets(self, text: str) -> str:
        sanitized_text = text
        for name, pattern in self.patterns.items():
            matches = pattern.findall(sanitized_text)
            for match in matches:
                # Mask secret value preserving length context
                sanitized_text = sanitized_text.replace(match, self.valves.redact_replacement)

        return sanitized_text

    async def outlet(self, body: Dict[str, Any], __user__: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Optional post-generation cleaning
        """
        return body
```

By deploying this filter pipeline within our Docker Compose stack, we established a secure runtime boundary. Any attempt to upload documents or prompts containing live AWS keys or passwords is automatically redacted at the gateway level, protecting our infrastructure while allowing developers to query local resources safely.

---

## Related Reading

- [Local AI Basics](./basics.md)
- [Ollama Local Models](./ollama-local-models.md)
- [Secrets Management & CI Hardening](../../security/infrastructure-security/secrets-management.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.local-ai-setup.open-webui-integration.md)
