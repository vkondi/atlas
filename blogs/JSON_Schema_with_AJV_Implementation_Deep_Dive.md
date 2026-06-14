---
title: 'JSON Schema with AJV: Implementation Deep Dive'
tags:
  - json-schema
  - ajv
  - data-validation
  - javascript
  - typescript
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/json-schema-with-ajv-implementation-deep-dive
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/json-schema-with-ajv-implementation-deep-dive
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md) ![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/JSON_Schema_with_AJV_Implementation_Deep_Dive.md)

![part2](uploads/4eba1f37ce67d9acd99afa186a458903/part2.png)

_Part 2 of 3: Getting Your Hands Dirty_

Welcome back! In [Part 1](./JSON_Schema_Your_Datas_New_Best_Friend.md), we covered the basics of JSON Schema and why it's awesome. Now it's time to roll up our sleeves and implement some real validation with AJV (Another JSON Schema Validator) – the Swiss Army knife of JSON validation.

## Why AJV Rules the Validation World

AJV isn't just another validation library – it's THE validation library. Here's why developers love it:

- **Blazingly Fast**: Compiles schemas to optimized JavaScript functions
- **Fully Compliant**: Supports JSON Schema draft-07 and draft 2019-09
- **Extensible**: Custom keywords, formats, and error messages
- **TypeScript Ready**: Excellent TypeScript support out of the box

## Getting Started: Installation and Basic Setup

```bash
# The essentials
npm install ajv

# Optional but recommended additions
npm install ajv-formats ajv-errors ajv-keywords
```

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Create your AJV instance
const ajv = new Ajv({
  allErrors: true, // Collect all errors, not just the first
  removeAdditional: true, // Remove additional properties
  useDefaults: true, // Apply default values
});

// Add common formats (email, date, uri, etc.)
addFormats(ajv);

// Now you're ready to validate!
```

## Your First Real Validation

Let's build something practical – a user registration validator:

```typescript
const userRegistrationSchema = {
  type: 'object',
  properties: {
    username: {
      type: 'string',
      minLength: 3,
      maxLength: 20,
      pattern: '^[a-zA-Z0-9_]+$',
    },
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 8,
      pattern:
        '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
    },
    age: {
      type: 'number',
      minimum: 13,
      maximum: 120,
    },
    preferences: {
      type: 'object',
      properties: {
        newsletter: { type: 'boolean', default: false },
        theme: { enum: ['light', 'dark'], default: 'light' },
      },
      additionalProperties: false,
    },
  },
  required: ['username', 'email', 'password', 'age'],
  additionalProperties: false,
};

// Compile the schema (do this once, reuse many times)
const validateUser = ajv.compile(userRegistrationSchema);

// Test it out
function registerUser(userData: any) {
  const valid = validateUser(userData);

  if (!valid) {
    console.log('Validation failed:');
    validateUser.errors?.forEach((error) => {
      console.log(`- ${error.instancePath}: ${error.message}`);
    });
    return null;
  }

  console.log('✅ User data is valid!');
  return userData; // Now with defaults applied!
}

// Try it
const newUser = {
  username: 'coolguy123',
  email: 'cool@example.com',
  password: 'SuperSecret123!',
  age: 25,
};

registerUser(newUser);
// ✅ User data is valid!
// Note: preferences.newsletter and preferences.theme get default values
```

## Advanced AJV Features That'll Blow Your Mind

### 1. Custom Keywords

Sometimes the built-in validation isn't enough. Let's create a custom keyword:

```typescript
// Add a custom "isAdult" keyword
ajv.addKeyword({
  keyword: 'isAdult',
  type: 'number',
  schemaType: 'boolean',
  compile(schemaVal) {
    return function validate(data) {
      if (schemaVal) {
        return data >= 18;
      }
      return true;
    };
  },
  errors: false,
  metaSchema: {
    type: 'boolean',
  },
});

// Use it in a schema
const adultSchema = {
  type: 'object',
  properties: {
    age: {
      type: 'number',
      isAdult: true,
    },
  },
};

const validateAdult = ajv.compile(adultSchema);
console.log(validateAdult({ age: 17 })); // false
console.log(validateAdult({ age: 21 })); // true
```

### 2. Conditional Validation

Real-world data often has complex relationships. AJV handles this beautifully:

```typescript
const conditionalSchema = {
  type: 'object',
  properties: {
    userType: { enum: ['admin', 'user', 'guest'] },
    permissions: {
      type: 'array',
      items: { type: 'string' },
    },
    adminKey: { type: 'string' },
  },
  required: ['userType'],

  // If user is admin, they need permissions and adminKey
  if: {
    properties: {
      userType: { const: 'admin' },
    },
  },
  then: {
    required: ['permissions', 'adminKey'],
    properties: {
      permissions: { minItems: 1 },
    },
  },

  // If user is guest, no additional requirements
  else: {
    if: {
      properties: {
        userType: { const: 'guest' },
      },
    },
    then: {
      // Guests can't have permissions
      not: {
        required: ['permissions'],
      },
    },
  },
};
```

### 3. Schema Composition with $ref

Keep your schemas DRY and maintainable:

```typescript
const schemas = {
  // Base address schema
  address: {
    $id: 'https://example.com/schemas/address.json',
    type: 'object',
    properties: {
      street: { type: 'string' },
      city: { type: 'string' },
      zipCode: {
        type: 'string',
        pattern: '^[0-9]{5}(-[0-9]{4})?$',
      },
    },
    required: ['street', 'city', 'zipCode'],
  },

  // Person schema using address
  person: {
    $id: 'https://example.com/schemas/person.json',
    type: 'object',
    properties: {
      name: { type: 'string' },
      homeAddress: { $ref: 'address.json' },
      workAddress: { $ref: 'address.json' },
    },
  },
};

// Add schemas to AJV
ajv.addSchema(schemas.address);
ajv.addSchema(schemas.person);

const validatePerson = ajv.getSchema('https://example.com/schemas/person.json');
```

## Error Handling Like a Pro

Default AJV errors are... functional. But we can make them much better:

```typescript
import addErrors from 'ajv-errors';
addErrors(ajv);

const betterUserSchema = {
  type: 'object',
  properties: {
    username: {
      type: 'string',
      minLength: 3,
      maxLength: 20,
      pattern: '^[a-zA-Z0-9_]+$',
    },
    password: {
      type: 'string',
      minLength: 8,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
    },
  },
  required: ['username', 'password'],

  // Custom error messages
  errorMessage: {
    properties: {
      username:
        'Username must be 3-20 characters long and contain only letters, numbers, and underscores',
      password:
        'Password must be at least 8 characters with uppercase, lowercase, and a number',
    },
    required: {
      username: 'Username is required',
      password: 'Password is required',
    },
  },
};
```

## Performance Tips That Actually Matter

### 1. Compile Once, Use Many Times

```typescript
// ❌ DON'T do this
function validateUserData(data: any) {
  const validate = ajv.compile(userSchema); // Compiling every time!
  return validate(data);
}

// ✅ DO this instead
const validateUserData = ajv.compile(userSchema); // Compile once

function checkUser(data: any) {
  return validateUserData(data); // Reuse compiled function
}
```

### 2. Use removeAdditional for Large Objects

```typescript
const ajv = new Ajv({
  removeAdditional: 'all', // Strip unknown properties automatically
});

// Input: { name: "Bob", age: 25, secretHackerData: "evil" }
// After validation: { name: "Bob", age: 25 }
```

### 3. Optimize for Your Use Case

```typescript
// For APIs - fast validation, detailed errors
const apiAjv = new Ajv({
  allErrors: true,
  verbose: true,
});

// For data processing - fastest validation
const processingAjv = new Ajv({
  allErrors: false,
  verbose: false,
  validateSchema: false,
});
```

## TypeScript Integration (The Cherry on Top)

AJV plays beautifully with TypeScript:

```typescript
import { JSONSchemaType } from 'ajv';

// Define your TypeScript interface
interface User {
  id: string;
  name: string;
  age: number;
  email?: string;
}

// Create a typed schema
const userSchema: JSONSchemaType<User> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    age: { type: 'number' },
    email: { type: 'string', nullable: true },
  },
  required: ['id', 'name', 'age'],
  additionalProperties: false,
};

// Compile with type safety
const validateUser = ajv.compile(userSchema);

// TypeScript knows the validated data structure!
function processUser(userData: unknown): User | null {
  if (validateUser(userData)) {
    // userData is now typed as User!
    return userData;
  }
  return null;
}
```

## Common Gotchas (Learn From My Mistakes)

### 1. Format Validation Needs ajv-formats

```typescript
// This won't work without ajv-formats
const schema = {
  type: 'string',
  format: 'email', // Silently ignored!
};

// Fix it
import addFormats from 'ajv-formats';
addFormats(ajv);
```

### 2. RegExp Patterns Need Double Escaping

```typescript
// ❌ Wrong
pattern: '^\d{3}-\d{3}-\d{4}$';

// ✅ Correct
pattern: '^\\d{3}-\\d{3}-\\d{4}$';
```

### 3. additionalProperties vs Properties

```typescript
// This allows ANY additional properties
const schema1 = {
  type: 'object',
  properties: { name: { type: 'string' } },
  // additionalProperties defaults to true
};

// This blocks additional properties
const schema2 = {
  type: 'object',
  properties: { name: { type: 'string' } },
  additionalProperties: false,
};
```

## Wrapping Up Part 2

You now have the power to implement robust, fast, and maintainable validation in your applications! AJV transforms JSON Schema from a simple concept into a validation powerhouse.

## Coming Up in Part 3...

In the final part of our series, we'll explore real-world applications:

- Building API validation middleware
- Data pipeline validation patterns
- HAL (Hypermedia) schemas for self-describing APIs
- Testing strategies for schema validation
- Production ready tips

_Ready to put this knowledge to work in production? Part 3 is where the magic happens!_ 🎯

---

**Series Navigation:**

- [Part 1: Understanding the Basics](./JSON_Schema_Your_Datas_New_Best_Friend.md)
- **Part 2: Implementation with AJV** ← You are here
- [Part 3: Real-World Applications & HAL](./JSON_Schema_in_the_Wild_Real_World_Applications__HAL.md)
