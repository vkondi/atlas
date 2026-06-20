[⬅️ Back to Databases & Data Modeling](../README.md)

# Data Modeling Fundamentals

An analysis of conceptual, logical, and physical modeling stages, normalization rules (1NF, 2NF, 3NF), and denormalization trade-offs.

---

## Why It Matters

Data modeling is the foundation of backend engineering. It maps dynamic business logic into concrete database storage structures. A poorly modeled database—such as prematurely denormalizing tables without understanding query access paths, or failing to normalize transactional tables—causes duplicate data entry, update anomalies, and structural rigidity. Designing clean models at the start prevents costly migrations, secures data integrity, and improves execution speeds.

---

## Core Concepts

### 1. The Three Stages of Data Modeling

Data modeling progresses from business logic to technical execution:

- **Conceptual Data Model**: A high-level, technology-independent model mapping business entities and their relationships. (e.g., "A _Customer_ can place many _Orders_"). Used to align business stakeholders.
- **Logical Data Model**: Adds detail to entities, defining attributes, data types, primary keys, and foreign keys, but remains independent of the target database technology (relational vs NoSQL).
- **Physical Data Model**: The actual database implementation. Translates the logical model into SQL tables, document collections, partition keys, column families, indices, and database-specific engines (e.g., InnoDB, PostgreSQL JSONB).

### 2. Normalization Rules (Reducing Redundancy)

Normalization is the process of structuring relational tables to minimize data redundancy and prevent data modification anomalies. It is divided into progressive forms:

#### First Normal Form (1NF): Atomic Values

- **Rule**: Each table cell must contain a single, atomic value (no arrays, lists, or comma-separated strings inside a column), and each row must be uniquely identifiable.
- _Example Violation_: Storing a user's phone numbers as a comma-separated string: `"555-0199, 555-0122"`.
- _Resolution_: Split phone numbers into individual rows in a separate `user_phones` table.

#### Second Normal Form (2NF): No Partial Key Dependencies

- **Rule**: Must satisfy 1NF, and all non-key columns must depend on the _entire_ Primary Key (only relevant for composite primary keys).
- _Example Violation_: In a composite primary key table `(Order_ID, Product_ID)`, having a column `Product_Description`. The description depends only on `Product_ID`, not `Order_ID`.
- _Resolution_: Move product details to a separate `products` table, referencing `Product_ID` as a foreign key.

#### Third Normal Form (3NF): No Transitive Dependencies

- **Rule**: Must satisfy 2NF, and no non-key column can depend on the primary key _transitively_ via another non-key column.
- _Example Violation_: In a `users` table with primary key `user_id`, having columns `zip_code` and `city`. `city` depends on `zip_code`, which in turn depends on `user_id`.
- _Resolution_: Extract `zip_code` and `city` to a separate `locations` table, leaving only `zip_code` in the `users` table as a foreign key.

### 3. Denormalization Trade-offs

While normalization is crucial for transactional consistency (OLTP systems), it requires multiple table joins at query time. For high-scale or analytical databases (OLAP/NoSQL systems), developers purposefully execute **Denormalization**:

- **Benefit**: Speeds up read queries by pre-joining data and storing it redundantly, avoiding CPU-intensive join overhead.
- **Cost**: Data updates become slower and more complex. The application layer must update duplicate fields in multiple locations simultaneously, increasing the risk of data inconsistency.

---

## Real-World Production Learnings

In our early Customer Relationship Management (CRM) platform, we modeled our customer accounts with a single flat `users` table:

```sql
-- Legacy 3NF Violation Schema
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100),
    company_name VARCHAR(100),
    company_tax_id VARCHAR(50),
    company_hq_address TEXT
);
```

As the service scaled, we noticed that when a business client moved to a new office, their employees (our users) still showed their historical office address.

**The Diagnostic**:

- This schema violated **Third Normal Form (3NF)**: `company_tax_id` and `company_hq_address` depended on `company_name`, which transitively depended on `user_id`.
- When a company updated its details, our backend had to query and update hundreds of individual user rows. If one of those updates failed or timed out, it left users from the same company with mismatching tax IDs and addresses.

**The Refactor**:
We normalized the database structure to **3NF**:

1. We created a separate `companies` table to hold corporate profiles.
2. We modified the `users` table to reference the company via a foreign key:

```sql
CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    tax_id VARCHAR(50) UNIQUE,
    hq_address TEXT
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100),
    company_id INTEGER REFERENCES companies(company_id)
);
```

This migration completely eliminated update inconsistencies. When a company updated its tax ID or office address, the change was made in a single row in the `companies` table, and all employee records instantly reflected the updated details, reducing database storage requirements by 15%.

---

## Related Reading

- [JSON Schema Validation](./json-schema-validation.md)
- [Schema Evolution & Migrations](./schema-evolution-migrations.md)
- [Relational Database Basics](../relational/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.data-modeling.basics.md)
