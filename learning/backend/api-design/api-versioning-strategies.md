[⬅️ Back to Backend Engineering](../README.md)

# API Versioning

API versioning is the practice of managing changes to an API boundary without breaking existing client integrations. It guarantees backward compatibility while allowing backend architectures to evolve.

---

## Why It Matters

An API is a binding contract. Once external developers or client apps (like iOS/Android mobile clients) consume your API, changing a property name or deleting an endpoint will cause those client applications to crash. Since you cannot force users to update their mobile apps instantly, versioning schemes are required to serve both legacy and modern clients concurrently.

---

## Versioning Strategies

There are three primary methodologies for versioning HTTP-based REST APIs:

```
                            Versioning Methods
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
           [ URI Path ]        [ Custom Header ]    [ Accept Header ]
           /v2/products        X-API-Version: 2     Accept: application/
                                                    vnd.app.v2+json
```

### 1. URI Path Versioning

The version number is explicitly hardcoded into the request path:

- **Example**: `GET https://api.example.com/v2/users`
- **Pros**: Extremely simple to configure and test in browsers. Routing can be easily handled at the load balancer or API Gateway level.
- **Cons**: Violates the REST constraint of unique resource identification. Changing the version changes the URI, meaning the same user resource now has two different URLs (e.g. `/v1/users/5` and `/v2/users/5`).

### 2. Custom Header Versioning

The client passes the requested API version inside a custom HTTP header:

- **Example**: `GET https://api.example.com/users` with header `X-API-Version: 2` or `Accept-Version: v2`.
- **Pros**: URL remains clean and resource-focused. Bypasses URL duplicate issues.
- **Cons**: Requires custom header injection on all client requests, which is harder to execute for simple HTML integrations.

### 3. Media Type Negotiation (Accept Header)

The client specifies the requested version inside the standard HTTP `Accept` header alongside the content type:

- **Example**: `GET https://api.example.com/users` with header `Accept: application/vnd.mycompany.v2+json`.
- **Pros**: The most REST-compliant approach. Leverages native HTTP content negotiation rules.
- **Cons**: High backend routing complexity. Developers must inspect headers in controllers to route logic, leading to complex routing libraries.

---

## Deprecation & Sunsetting Standards

API versions cannot be maintained indefinitely. When releasing a new API version, establish a structured deprecation roadmap using standard HTTP response headers:

- **`Deprecation` Header**: Informs clients that the requested endpoint version is deprecated and will be removed in the future.
  - `Deprecation: Wed, 11 Nov 2026 00:00:00 GMT`
- **`Sunset` Header**: Declares the exact date the API version will be completely turned off.
  - `Sunset: Thu, 11 Nov 2027 00:00:00 GMT`
- **Warning Logs**: Configure backend telemetry alerts to track the volume of requests using deprecated versions, allowing marketing and developer relations teams to contact target users before the sunset cutoff.

---

## Real-World Production Learnings

In a public B2B shipping SaaS, we launched a major `/v2/checkout` rewrite that altered our payload structure. Initially, we maintained both `/v1/checkout` and `/v2/checkout` controller paths in our main Node.js backend repository.

Over the next two years, maintaining both code branches became a developer bottleneck. Every database schema change or security patch had to be applied to both controllers, leading to duplicated test cases and complex database queries mapping the old v1 database schemas to the new v2 columns.

We resolved this code-maintenance bottleneck by moving the backward-compatibility layer to our **API Gateway**:

1. We removed the legacy `/v1` controllers from our Node.js repository entirely, keeping the application code focused exclusively on the `/v2` structures.
2. Inside our API Gateway (using Lua rules in Kong), we intercepted incoming `/v1/checkout` requests, translated the v1 JSON payload format to the expected v2 format on the fly, proxy-forwarded the request internally to the main `/v2` backend service, and then mapped the v2 response back to the legacy v1 format.

This translation-proxy pattern allowed us to preserve backward compatibility for over 2,000 legacy client integrations while cleaning up our core backend codebase, proving that versioning is often best resolved at the network routing tier.

---

## Related Reading

- [API Design Fundamentals](./basics.md)
- [REST API Principles](./rest-api-principles.md)
- [gRPC & Protocol Buffers](./grpc-and-protocol-buffers.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.api-design.api-versioning-strategies.md)
