[⬅️ Back to Backend Engineering](../README.md)

# GraphQL API Design

GraphQL is a query language and runtime for APIs that prioritizes giving clients the power to request exactly the data they need, simplifying client-side data compilation.

---

## Why It Matters

In a traditional REST API, client devices must download pre-defined datasets. A mobile device displaying a simple username list must download complete user profiles containing large nested fields (over-fetching). Conversely, if the page displays users and their comments, the client must trigger multiple API calls sequentially (under-fetching).

GraphQL replaces multiple endpoints with a single `/graphql` POST entry point, letting clients select the exact fields required. However, this flexibility shifts execution complexity to the server, creating severe database bottlenecks if queries are not designed defensively.

---

## Core GraphQL Specifications

A GraphQL API is defined by its data contracts, structured using the Schema Definition Language (SDL):

```
                       GraphQL Schema Operations
                      /            |            \
            [ Query ]         [ Mutation ]    [ Subscription ]
            - Read data       - Write/Update  - Live stream
            - Idempotent      - Non-idempotent- Websockets
```

### 1. Operations

- **Query**: Client requests to retrieve data. Similar to a REST `GET` request.
- **Mutation**: Operations that modify server-side state (Create, Update, Delete). Similar to REST `POST`, `PUT`, or `DELETE` requests.
- **Subscription**: A persistent WebSocket connection that streams real-time updates from the server to the client whenever specific events occur.

### 2. Schema and Resolvers

- **Schema**: Define custom type systems, interfaces, and root entry points.
- **Resolvers**: Individual developer-defined functions mapping schema fields to database or external API operations. Every field queried in a GraphQL request runs its own resolver function.

---

## Performance & Security Guardrails

### N+1 Query Bottleneck

The N+1 query problem is the most common GraphQL performance issue. It occurs when a query requests a list of parent items and their nested child items. The resolver executes one query to fetch the list of parents (1), and then executes a separate database lookup for each child row (N), resulting in N+1 database queries.

```
    Client Query: { books { title author { name } } }

    1. SQL Server: SELECT * FROM books; ---> Returns 50 books.
    2. SQL Server: SELECT * FROM authors WHERE id = book1.authorId;
    3. SQL Server: SELECT * FROM authors WHERE id = book2.authorId;
    ... (executed 50 times) ---> Severe database load!
```

#### The Solution: DataLoader

**DataLoader** is a library that batches and caches database requests within a single frame of the event loop. Instead of executing individual database calls, DataLoader waits, groups the IDs into an array, and makes a single batched database query using SQL `IN` operators:

```javascript
// Initializing a batch loader
const authorLoader = new DataLoader(async (authorIds) => {
  // Executes 1 query instead of N: SELECT * FROM authors WHERE id IN (...)
  const authors = await db.authors.findMany({
    where: { id: { in: authorIds } },
  });

  // Return authors in the exact order of the requested IDs
  return authorIds.map((id) => authors.find((author) => author.id === id));
});

// Resolver function calling the loader
const resolvers = {
  Book: {
    author: (book, args, context) => context.authorLoader.load(book.authorId),
  },
};
```

---

## Real-World Production Learnings

In an enterprise analytics feed dashboard displaying activity logs, page load times climbed to 4.2 seconds under peak loads.

We monitored our SQL execution log and found that loading 100 activity entries was triggering 101 separate SQL database queries: one query to fetch the logs, and 100 queries to retrieve user details (`SELECT * FROM users WHERE id = ...`) for each log row.

We implemented two fixes:

1. We integrated **DataLoader** inside our server context, batching the user lookups into a single `WHERE id IN (...)` query. This reduced database calls from 101 to 2.
2. We introduced **Query Depth Limiting** (`graphql-depth-limit`) to restrict clients from executing malicious, deeply nested queries (e.g. `logs { user { logs { user { ... } } } }`) which could trigger recursive loops, crashing the Node.js server.

The database query execution duration fell from 4.2 seconds to 16ms, completely resolving the load jank and securing our server against recursion exploits.

---

## Related Reading

- [API Design Fundamentals](./basics.md)
- [REST API Principles](./rest-api-principles.md)
- [gRPC & Protocol Buffers](./grpc-and-protocol-buffers.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.api-design.graphql-fundamentals.md)
