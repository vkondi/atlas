[⬅️ Back to Databases & Data Modeling](../README.md)

# MongoDB Document Design

A technical guide on document schema design, embedding vs. referencing boundaries, index optimization (compound and partial), and aggregation pipeline tuning.

---

## Why It Matters

MongoDB is a document store engineered for scale and write performance. Unlike relational databases that normalize structures to avoid duplicate fields, MongoDB encourages denormalization because it enforces single-document atomic transactions and does not natively support distributed multi-shard joins. Failing to model schemas correctly—such as nesting unbounded arrays inside documents or designing relational-style referenced schemas that rely on heavy `$lookup` operations—leads to high CPU utilization, memory congestion, and application failures when documents hit MongoDB's **16MB BSON size limit**.

---

## Core Concepts

### 1. Embedded vs. Referenced Models

The core decision in document modeling is choosing between nesting data or separating it across collections:

#### Embedded Model (Denormalization)

Stores nested child data directly inside a single parent document (e.g., nesting user addresses inside the user document):

- **When to use**: For 1-to-Few relationships, or 1-to-Many relationships where the child data is bounded and always read alongside the parent.
- **Benefits**: High-speed read performance (fetches the entire entity in a single disk seek) and atomic updates on nested properties.
- **Drawbacks**: Risk of duplicating data (e.g., duplicating product details in an order document) and document bloat.

#### Referenced Model (Normalization)

Links distinct documents in different collections using references (e.g., storing a user's order IDs in an array, or placing `userId` inside the order document):

- **When to use**: For 1-to-Many relationships where child data is unbounded (e.g., logging activity events for a user) or Many-to-Many relationships.
- **Benefits**: Avoids document size growth limits and prevents data duplication.
- **Drawbacks**: Requires multiple application queries or slow `$lookup` aggregation stages to assemble data.

### 2. Index Optimization: The ESR Rule

Indexes speed up document lookup, but compound indexes must follow the strict **ESR (Equality, Sort, Range)** sequence rule to prevent CPU-intensive in-memory sorting:

1. **E**quality: Place fields queried for exact matches first (e.g., `status: "active"`).
2. **S**ort: Place fields used to sort results second (e.g., `created_at: -1`).
3. **R**ange: Place fields queried using range operators ($>$, $<$, `$in`) last (e.g., `age: { $gt: 21 }`).

```javascript
// Correctly sequenced compound index based on ESR
db.users.createIndex({ status: 1, created_at: -1, age: 1 });

// This query successfully traverses the index for filtering and sorting
db.users.find({ status: 'active', age: { $gt: 21 } }).sort({ created_at: -1 });
```

- **Partial Indexes**: Index only documents that match a specific filter expression, saving disk space (e.g., indexing email columns only where `email` exists).

### 3. Aggregation Pipeline Tuning

The MongoDB Aggregation Pipeline processes arrays of documents through sequence stages. Tuning rules include:

- **Filter Early**: Place `$match` and `$sort` stages at the very beginning of the pipeline. If placed after transformation stages (like `$project` or `$unwind`), MongoDB cannot utilize database indexes.
- **Limit Projected Fields**: Use `$project` or `$unset` late in the pipeline to drop unnecessary fields, reducing the payload size of documents flowing through RAM buffers.
- **Streamline Joins**: Restrict the use of `$lookup`. If a lookup is required, match and filter the host collection documents _before_ joining to minimize the number of lookups executed.

---

## Real-World Production Learnings

In our e-commerce platform, we originally modeled product reviews by embedding them directly inside our `products` collection:

```json
{
  "_id": "prod_1029",
  "name": "Mechanical Keyboard",
  "price": 120.0,
  "reviews": [
    {
      "user": "alice",
      "rating": 5,
      "comment": "Excellent!",
      "date": "2026-01-01"
    },
    {
      "user": "bob",
      "rating": 4,
      "comment": "Good build.",
      "date": "2026-01-02"
    }
  ]
}
```

As the platform grew, popular items accumulated over 40,000 customer reviews.

This schema caused major performance bottlenecks:

1. Product pages loaded slowly. Fetching a single product document transferred over 12MB of reviews database data over the network, even though the page only displayed the 5 most recent reviews.
2. Under peak events, updates failed with `BSONObj size (16777216 bytes) is invalid` errors because popular product documents hit MongoDB's 16MB document size ceiling.

**The Refactor**:
We redesigned the schema using the **Bucket Pattern**:

- We removed the `reviews` array from the `products` collection.
- We created a separate `product_reviews` collection where reviews are grouped into physical document buckets of 100 reviews per product:

```json
{
  "_id": "prod_1029_bucket_1",
  "product_id": "prod_1029",
  "bucket_num": 1,
  "count": 100,
  "reviews": [
    {
      "user": "alice",
      "rating": 5,
      "comment": "Excellent!",
      "date": "2026-01-01"
    }
    // ... Capped at 100 review items ...
  ]
}
```

When users browsed product pages, the backend fetched the product detail document (now a tiny 1KB record) in 1ms. When the user clicked on reviews, we fetched only the most recent bucket document (`bucket_num: 1`) using a simple index, providing fast paginated reviews without hitting the BSON limit or exhausting database memory.

---

## Related Reading

- [NoSQL Databases Overview](./basics.md)
- [Redis Caching & Data Structures](./redis-caching-data-structures.md)
- [Schema Evolution & Migrations](../data-modeling/schema-evolution-migrations.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.non-relational.mongodb-document-modeling.md)
