[⬅️ Back to Frontend Engineering](../README.md)

# Utility Types

Utility Types are built-in type transformers provided globally by TypeScript. They operate on existing types to create variations—such as making properties optional, selecting specific fields, or extracting function parameters—without manually redefining shapes.

---

## Why It Matters

As codebases scale, duplicating object interfaces to match slightly different context requirements (e.g., creating a record vs. updating it) leads to type drift and maintenance overhead. Utility types enforce a DRY (Don't Repeat Yourself) type architecture by allowing you to derive specialized interfaces from single sources of truth.

---

## Primary Utility Types

### 1. Object Sizing & Mutation Utilities

These utilities modify property modifiers and construct object shapes:

- **`Partial<T>`**: Converts all properties of type `T` to optional (`?`):

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}
type UserUpdatePayload = Partial<User>; // { id?: string; name?: string; ... }
```

- **`Required<T>`**: Converts all optional properties of type `T` to concrete, mandatory fields (removes the `?` modifiers).
- **`Readonly<T>`**: Makes all properties of type `T` read-only, preventing reassignment.

### 2. Selection & Exclusion Utilities

These utilities filter properties out of existing object shapes:

- **`Pick<T, K>`**: Constructs a new type by selecting a set of keys `K` from type `T`:

```typescript
type UserContactInfo = Pick<User, 'name' | 'email'>; // { name: string; email: string; }
```

- **`Omit<T, K>`**: Constructs a type by picking all properties from type `T` and then removing keys `K`:

```typescript
type UserWithoutId = Omit<User, 'id'>; // { name: string; email: string; }
```

### 3. Function Extraction Utilities

These extract type signatures directly from function types:

- **`ReturnType<T>`**: Extracts the return type of a function type `T`:

```typescript
function getUser() {
  return { id: '123', name: 'Alice' };
}
type UserResult = ReturnType<typeof getUser>; // { id: string; name: string; }
```

- **`Parameters<T>`**: Extracts the parameter types of a function type `T` as a tuple:

```typescript
function saveUser(id: string, age: number) {}
type SaveArgs = Parameters<typeof saveUser>; // [string, number]
```

### 4. Union Manipulation Utilities

- **`Exclude<T, U>`**: Excludes types matching `U` from union type `T`.
- **`Extract<T, U>`**: Extracts types matching `U` from union type `T`.
- **`NonNullable<T>`**: Strips `null` and `undefined` options from type `T`.

---

## Real-World Production Learnings

In an enterprise database edit form module, our update API endpoint required the entity `id` to be mandatory, while all other update fields (such as `name`, `status`, `balance`) had to be optional. Instead of maintaining a separate, duplicate interface (`UserUpdateForm`), which would easily break when database columns were updated, we composed the payload dynamically:

```typescript
interface BankAccount {
  id: string;
  owner: string;
  balance: number;
  routing: string;
  status: 'active' | 'suspended';
}

// Composition: id is required, all other fields are optional and extracted dynamically
type AccountUpdatePayload = Pick<BankAccount, 'id'> &
  Partial<Omit<BankAccount, 'id'>>;

const update: AccountUpdatePayload = {
  id: 'acc-9012',
  status: 'suspended', // Safe update of status only
};
```

This configuration guaranteed that if we added new columns to `BankAccount` later, they immediately became optional parameters in the update form payloads without manual typing.

---

## Related Reading

- [TypeScript Foundations](./basics.md)
- [Advanced Types](./advanced-types.md)
- [Generics](./generics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.typescript.utility-types.md)
