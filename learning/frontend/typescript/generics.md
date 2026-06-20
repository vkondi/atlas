[⬅️ Back to Frontend Engineering](../README.md)

# Generics

Generics are template parameters that enable functions, classes, and interfaces to operate over a variety of datatypes while preserving compile-time type-safety. Rather than using the unsafe `any` type, generics act as placeholders that lock in exact type bindings at invocation.

---

## Why It Matters

Without generics, reusable components must rely on type casting, loose interfaces, or code duplication to accept different types. Generics preserve type relationships between inputs and outputs—such as ensuring a function returning a value from an array returns the exact type of the array's items.

---

## Core Concepts

### 1. Type Parameters

Type parameters are variables that represent types rather than runtime values. By convention, they are represented with uppercase letters (e.g., `<T>`), though descriptive names (e.g., `<TResponse>`) are preferred in complex implementations:

```typescript
function identity<T>(arg: T): T {
  return arg;
}

const value = identity<string>('myString'); // Inferred/locked as string
```

### 2. Generic Constraints (`extends`)

By default, a generic parameter `<T>` accepts any type. You can restrict acceptable types by applying constraints using the `extends` keyword:

```typescript
interface HasId {
  id: string;
}

// T is constrained: it must contain at least a string property named 'id'
function logUser<T extends HasId>(user: T) {
  console.log(user.id); // Safe to access because of constraint
}
```

### 3. Keyof Constraints

You can link one generic parameter to the properties of another generic parameter using `keyof`:

```typescript
// K must be an active property name key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 30 };
const userName = getProperty(user, 'name'); // type is string
// getProperty(user, "location"); // Error: Argument 'location' not assignable to keyof
```

### 4. Generic Classes & Interfaces

Generics can parameterize entire structural interfaces or classes:

```typescript
interface ApiResponse<TData> {
  data: TData;
  errors: string[] | null;
  status: number;
}

interface User {
  username: string;
}

const response: ApiResponse<User> = {
  data: { username: 'vkondi' },
  errors: null,
  status: 200,
};
```

---

## Real-World Production Learnings

In an enterprise database orchestration layer, we had separate service classes fetching records for `Users`, `Ledgers`, and `Portfolios`. Each class duplicated identical fetch and cache mechanisms. We resolved this code replication by creating a single generic `DataRepository` class:

```typescript
class DataRepository<TEntity extends { id: string }> {
  private cache = new Map<string, TEntity>();

  constructor(private apiEndpoint: string) {}

  async fetch(id: string): Promise<TEntity> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    const response = await fetch(`${this.apiEndpoint}/${id}`);
    const entity: TEntity = await response.json();
    this.cache.set(id, entity);
    return entity;
  }
}
```

This change consolidated our data fetching logic into a single repository class while maintaining complete, compile-time type checking for each distinct entity type.

---

## Related Reading

- [TypeScript Foundations](./basics.md)
- [Advanced Types](./advanced-types.md)
- [Clean Architecture Principles](../../software-architecture/architectural-patterns/clean-architecture-principles.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.typescript.generics.md)
