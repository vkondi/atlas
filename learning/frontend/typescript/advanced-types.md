[⬅️ Back to Frontend Engineering](../README.md)

# Advanced Types

Advanced TypeScript engineering moves beyond basic interface declarations, leveraging compile-time type calculations to build resilient, self-documenting APIs. By combining conditional types, mapped types, index access, and type checks, we can construct type definitions that adapt dynamically to shape changes.

---

## Why It Matters

In large, complex codebases, manual type maintenance leads to code duplication and drift (where type mappings fall out of sync with runtime values). Advanced types allow you to declare single sources of truth for data shapes and compute dependent type layers automatically, securing complex configurations like API request wrappers, event emitters, and state managers.

---

## Core Concepts

### 1. Discriminated Unions (Tagged Unions)

A discriminated union is a pattern for representing distinct object states in a single union type. By configuring a shared literal key property (the "discriminant"), you enable the compiler to narrow property access paths inside conditional branches:

```typescript
interface NetworkLoadingState {
  status: 'loading'; // Discriminant
}

interface NetworkSuccessState {
  status: 'success'; // Discriminant
  data: string[];
}

interface NetworkErrorState {
  status: 'error'; // Discriminant
  error: Error;
}

type NetworkState =
  | NetworkLoadingState
  | NetworkSuccessState
  | NetworkErrorState;

function handleState(state: NetworkState) {
  switch (state.status) {
    case 'loading':
      // state is narrowed to NetworkLoadingState (data/error are not accessible)
      showSpinner();
      break;
    case 'success':
      // state is narrowed to NetworkSuccessState (data is accessible)
      renderList(state.data);
      break;
    case 'error':
      // state is narrowed to NetworkErrorState (error is accessible)
      logError(state.error);
      break;
  }
}
```

### 2. Conditional Types

Conditional types allow you to evaluate type checks dynamically using a syntax resembling ternary operators:
$$\text{Type} = T \text{ extends } U ? X : Y$$

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
```

_The `infer` keyword_: Used within conditional checks to extract nested signatures dynamically:

```typescript
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

### 3. Mapped Types

Mapped types let you iterate over keys to create new object type shapes, transforming existing signatures:

```typescript
type ReadOnlyObject<T> = {
  readonly [K in keyof T]: T[K];
};

type Optionals<T> = {
  [K in keyof T]?: T[K];
};
```

You can use prefix modifiers (like `-readonly` or `-?`) to strip modifiers during mapping:

```typescript
// Concrete type generator removing optional flags from all properties
type Concrete<T> = {
  [Property in keyof T]-?: T[Property];
};
```

### 4. Template Literal Types

Template literal types enable dynamic string checks by combining literal types with string formatting expressions:

```typescript
type Direction = 'top' | 'right' | 'bottom' | 'left';
type Padding = `padding-${Direction}`; // "padding-top" | "padding-right" | ...
```

---

## Real-World Production Learnings

In an administrative workspace dashboard, we built an API event coordinator class. It managed dozens of events, each emitting a unique data payload. Originally, developers cast emitted payloads using type assertions (`data as UserProfile`), which caused runtime bugs when payload properties changed without updating target components. We refactored the class using advanced mapped types linked to a single event interface:

```typescript
interface AppEvents {
  'user:login': { userId: string; timestamp: number };
  'chat:message': { text: string; sender: string };
}

class EventCoordinator {
  emit<E extends keyof AppEvents>(event: E, data: AppEvents[E]) {
    // ...
  }
}
```

This change ensured that calling `emit('user:login', ...)` automatically autocompleted and verified the exact payload shape, catching payload structure errors during compile-time.

---

## Related Reading

- [TypeScript Foundations](./basics.md)
- [Generics](./generics.md)
- [Utility Types](./utility-types.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.typescript.advanced-types.md)
