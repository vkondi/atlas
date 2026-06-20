[⬅️ Back to Backend Engineering](../README.md)

# REST Architecture

Representational State Transfer (REST) is an architectural style that defines a set of constraints for creating stateless, scalable, and cacheable web services.

---

## Why It Matters

Many developer-facing APIs claim to be "RESTful" but are simply RPC (Remote Procedure Call) endpoints disguised as HTTP routes (e.g., using verbs in URLs, or returning `200 OK` for error states). When APIs violate REST constraints, intermediate network layers—such as CDNs, API Gateways, and browser caches—fail to cache resources correctly, leading to bloated network traffic, server overloads, and stale data bugs.

---

## Core REST Constraints & Concepts

To write a truly RESTful API, your system must adhere to six fundamental architectural constraints:

```
                          REST Constraints
          ┌───────────────────────┼──────────────────────┐
          ▼                       ▼                      ▼
    [ Statelessness ]     [ Uniform Interface ]   [ Cacheability ]
    No sessions stored    Nouns in URLs           Server declares cache
    in backend memory     HTTP verbs map states   headers explicitly
```

### 1. Statelessness

The server must not store any client session context. Each incoming request from a client must contain all the information necessary to understand and process the request (e.g., authentication tokens in the HTTP headers).

### 2. Client-Server Separation

The client (user interface) and the server (data storage and business logic) must be completely decoupled. This allows the client interface to be migrated or scaled independently of the backend data tier.

### 3. Cacheability

Server responses must define themselves as cacheable or non-cacheable (via standard HTTP headers like `Cache-Control` and `ETag`) to prevent clients from fetching static data repeatedly.

### 4. Uniform Interface (HATEOAS & HAL)

Resources must be identifiable via uniform URLs, and clients must interact with resources using standard HTTP verbs:

- **GET**: Retrieve a resource (Safe and Idempotent).
- **POST**: Create a new resource (Non-Idempotent).
- **PUT**: Replace a resource entirely (Idempotent).
- **PATCH**: Modify a resource partially (Non-Idempotent or Idempotent).
- **DELETE**: Remove a resource (Idempotent).

#### HATEOAS (Hypermedia As The Engine Of Application State)

A REST constraint stating that clients discover actions dynamically via hypermedia links returned inside the API payload. The client does not hardcode route paths; instead, it reads the links inside the response object.

#### HAL (Hypermedia Application Language)

A standard format for encoding links inside JSON payloads:

```json
{
  "id": 412,
  "title": "Staff Engineer Handbook",
  "_links": {
    "self": { "href": "/books/412" },
    "author": { "href": "/authors/95" },
    "purchase": { "href": "/books/412/checkout" }
  }
}
```

---

## Real-World Production Learnings

In an enterprise order fulfillment system, our client application queried a billing microservice via `GET /invoices/:id`. If the invoice did not exist, the billing API returned a status code of `200 OK` with a JSON body indicating the error:
`{ "status": "error", "message": "Invoice not found" }`

Because the API returned a `200 OK` status code, our API Gateway and intermediate CDN cached this "invoice not found" error under our standard cache rule for success endpoints. When a user created an invoice immediately afterwards, subsequent requests for the next 15 minutes still returned the cached "Invoice not found" error from the CDN, creating severe data-sync bugs.

We refactored the API to conform strictly to REST status contracts:

- If the invoice was not found, the server returned a `404 Not Found` (which the CDN was configured _not_ to cache).
- When creating an invoice, the server returned a `201 Created` status code, accompanied by a `Location: /invoices/123` header.

Adhering to standard HTTP status codes solved our caching issues immediately without writing any custom invalidation code, highlighting that REST principles are not just aesthetic rules—they are critical for correct protocol-level network behaviors.

---

## Related Reading

- [API Design Fundamentals](./basics.md)
- [API Versioning Strategies](./api-versioning-strategies.md)
- [JSON Schema in the Wild (HAL Blog)](../../../blogs/json-schema-series/JSON_Schema_in_the_Wild_Real_World_Applications__HAL.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.api-design.rest-api-principles.md)
