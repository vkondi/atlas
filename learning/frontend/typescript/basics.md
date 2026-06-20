[⬅️ Back to Frontend Engineering](../README.md)

# TypeScript Foundations

TypeScript is a strongly typed superset of JavaScript that compiles down to clean, plain JavaScript. Rather than acting as a separate runtime, TypeScript introduces a static type layer that validates code correctness during compile-time, acting as a guard rail for complex codebases.

---

## Why It Matters

JavaScript is dynamically typed, meaning type-related bugs (like accessing properties on `undefined`) are only caught during execution. TypeScript intercepts these errors before they reach production, documents code contracts, and enables precise IDE navigation, autocompletion, and safe refactoring.

---

## Core Concepts

### 1. Compile-Time Type Erasure

TypeScript does not exist at runtime. When the TypeScript compiler (`tsc`) processes files:

1. It validates the codebase against type rules and interfaces.
2. It compiles the source, stripping away all types, interfaces, generics, type guards, and annotations.
3. It emits plain JavaScript.

> [!WARNING]
> Because of **type erasure**, you cannot use TypeScript types to validate runtime payloads (like API responses or user form submissions). TypeScript types are purely static checks. For runtime validation, you must use validation libraries like JSON Schema/AJV or Zod.

### 2. Structural Typing vs. Nominal Typing

TypeScript uses a **structural type system** (often referred to as static duck typing), whereas languages like Java or C# use **nominal typing**:

- **Nominal Typing**: Class compatibility is determined by explicit declarations and class names.
- **Structural Typing**: Class/object compatibility is determined solely by the _shape_ of the properties:

```typescript
interface Point {
  x: number;
  y: number;
}

class Coordinates {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function plot(p: Point) {
  return `${p.x}, ${p.y}`;
}

// Structurally compatible, even though Coordinates does not implement Point explicitly
plot(new Coordinates(10, 20));
```

### 3. Type Inference

The TypeScript compiler is designed to infer types automatically based on values and control flow:

```typescript
let name = 'John'; // Inferred as string
// name = 42; // Error: Type 'number' is not assignable to 'string'
```

Avoid redundant type annotations (e.g., `const age: number = 25`) where the compiler can cleanly infer the type. Save annotations for function signatures, class members, and complex custom object definitions.

### 4. Compiler Configuration: Strict Mode

The `tsconfig.json` file configures compilation rules. For safety, always enable:

- `"strict": true`: Activates a suite of type-checking behaviors.
- `"noImplicitAny": true`: Raises errors on expressions where type is inferred as `any`.
- `"strictNullChecks": true`: Prevents calling methods or reading properties on null/undefined, separating null and undefined values from standard datatypes.

---

## Type Narrowing: `any` vs. `unknown`

- **`any`**: Turns off type-checking completely. Using `any` spreads unsafe code across your repository.
- **`unknown`**: Represents a value whose type is not yet verified (e.g., raw API responses). You cannot access properties on `unknown` until you narrow its type using Type Guards:

```typescript
function processPayload(data: unknown) {
  // Narrowing using typeof type guard
  if (typeof data === 'object' && data !== null && 'id' in data) {
    // TypeScript now knows 'data' is an object containing 'id'
    console.log((data as any).id); // Safer lookup
  }
}
```

---

## Real-World Production Learnings

In an online payment integration, our client API typed a status field as `type Status = 'success' | 'failed'`. The backend team updated the status responses to include a third state `'pending'`. Because TypeScript interfaces are erased during build-time, our compiled client code silently accepted the `'pending'` string at runtime, bypassing our UI error checks and causing the app to freeze. We resolved this by integrating runtime schema validation (Zod/JSON Schema) to verify incoming payloads before casting them to TypeScript types.

---

## Related Reading

- [Advanced Types](./advanced-types.md)
- [JavaScript Basics](../javascript/basics.md)
- [JSON Schema Validation](../../databases/data-modeling/json-schema-validation.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.typescript.basics.md)
