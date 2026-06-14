---
title: 'JSON Schema in the Wild: Real-World Applications & HAL'
tags:
  - json-schema
  - data-validation
  - api
  - web-development
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/json-schema-in-the-wild-real-world-applications-hal
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/json-schema-in-the-wild-real-world-applications-hal
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md)

![part3](../assets/blogs/part3.png)

_Part 3 of 3: Where Theory Meets Production_

Welcome to the final part of our JSON Schema journey! We've covered the theory and implementation – now let's see how JSON Schema solves real problems in production environments. Plus, we'll dive into HAL (Hypermedia Application Language) and how it plays beautifully with JSON Schema.

## 1. API Validation Middleware (Your APIs' Bodyguard)

Let's build bulletproof API validation that catches bad data before it causes havoc:

```typescript
import express from 'express';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Generic validation middleware
function validateRequest(
  schema: any,
  target: 'body' | 'query' | 'params' = 'body',
) {
  const validate = ajv.compile(schema);

  return (req: any, res: any, next: any) => {
    const dataToValidate = req[target];

    if (!validate(dataToValidate)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validate.errors?.map((err) => ({
          field: err.instancePath || err.params?.missingProperty,
          message: err.message,
          value: err.data,
        })),
      });
    }

    // Store validated data (with defaults applied!)
    req.validatedData = dataToValidate;
    next();
  };
}

// Define your schemas
const createUserSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 13, maximum: 120 },
    role: { enum: ['user', 'admin'], default: 'user' },
  },
  required: ['name', 'email', 'age'],
  additionalProperties: false,
};

const updateUserSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 13, maximum: 120 },
  },
  minProperties: 1, // At least one field must be provided
  additionalProperties: false,
};

// Use in your routes
const app = express();
app.use(express.json());

app.post('/users', validateRequest(createUserSchema, 'body'), (req, res) => {
  // req.validatedData contains clean, validated data
  const user = createUser(req.validatedData);
  res.json(user);
});

app.patch(
  '/users/:id',
  validateRequest(updateUserSchema, 'body'),
  (req, res) => {
    const userId = req.params.id;
    const updates = req.validatedData;
    const user = updateUser(userId, updates);
    res.json(user);
  },
);

// Query parameter validation too!
const searchSchema = {
  type: 'object',
  properties: {
    q: { type: 'string', minLength: 1 },
    page: { type: 'string', pattern: '^[1-9]\\d*$', default: '1' },
    limit: { type: 'string', pattern: '^(10|25|50|100)$', default: '25' },
  },
  required: ['q'],
  additionalProperties: false,
};

app.get('/search', validateRequest(searchSchema, 'query'), (req, res) => {
  const { q, page, limit } = req.validatedData;
  const results = searchUsers(q, parseInt(page), parseInt(limit));
  res.json(results);
});
```

## 2. Data Pipeline Validation (ETL with Confidence)

When processing large datasets, catching bad data early saves hours of debugging:

```typescript
// data-pipeline.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Schema for incoming data records
const dataRecordSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      pattern: '^[A-Z]{2}[0-9]{6}$', // e.g., "AB123456"
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
    value: {
      type: 'number',
      minimum: 0,
    },
    category: {
      enum: ['sales', 'marketing', 'support', 'development'],
    },
    metadata: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['source'],
      additionalProperties: true, // Allow extra metadata
    },
  },
  required: ['id', 'timestamp', 'value', 'category'],
  additionalProperties: false,
};

const validateRecord = ajv.compile(dataRecordSchema);

interface ProcessingResult {
  validRecords: any[];
  invalidRecords: Array<{
    record: any;
    errors: string[];
  }>;
  stats: {
    total: number;
    valid: number;
    invalid: number;
    validationRate: number;
  };
}

export function processDataBatch(records: any[]): ProcessingResult {
  const validRecords: any[] = [];
  const invalidRecords: any[] = [];

  records.forEach((record, index) => {
    if (validateRecord(record)) {
      validRecords.push(record);
    } else {
      invalidRecords.push({
        record,
        errors:
          validateRecord.errors?.map(
            (err) => `${err.instancePath || 'root'}: ${err.message}`,
          ) || [],
      });
    }
  });

  const total = records.length;
  const valid = validRecords.length;
  const invalid = invalidRecords.length;

  return {
    validRecords,
    invalidRecords,
    stats: {
      total,
      valid,
      invalid,
      validationRate: (valid / total) * 100,
    },
  };
}

// Usage in your ETL process
async function runETL(inputFile: string) {
  const rawData = await loadDataFromFile(inputFile);
  const result = processDataBatch(rawData);

  console.log(`Processed ${result.stats.total} records:`);
  console.log(
    `✅ Valid: ${result.stats.valid} (${result.stats.validationRate.toFixed(1)}%)`,
  );
  console.log(`❌ Invalid: ${result.stats.invalid}`);

  if (result.invalidRecords.length > 0) {
    console.log('\nInvalid records:');
    result.invalidRecords.slice(0, 5).forEach((invalid, i) => {
      console.log(`Record ${i + 1}:`, invalid.errors.join(', '));
    });
  }

  // Process only valid records
  await saveToDatabase(result.validRecords);

  // Log invalid records for investigation
  if (result.invalidRecords.length > 0) {
    await saveInvalidRecords(result.invalidRecords);
  }
}
```

## 3. HAL (Hypermedia Application Language) Schemas

HAL makes your APIs self-describing with built-in navigation. Think JSON with links that tell clients what actions they can take next.

### Basic HAL Structure & Schema

```typescript
// HAL link schema
const halLinkSchema = {
  type: 'object',
  properties: {
    href: { type: 'string', format: 'uri-reference' },
    templated: { type: 'boolean' },
    type: { type: 'string' },
  },
  required: ['href'],
  additionalProperties: false,
};

// Complete HAL resource schema
const halUserSchema = {
  type: 'object',
  properties: {
    // Resource data
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },

    // HAL links (required)
    _links: {
      type: 'object',
      properties: {
        self: halLinkSchema,
        edit: halLinkSchema,
        delete: halLinkSchema,
      },
      required: ['self'],
      additionalProperties: halLinkSchema,
    },

    // HAL embedded resources (optional)
    _embedded: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              _links: {
                type: 'object',
                properties: { self: halLinkSchema },
                required: ['self'],
              },
            },
            required: ['id', 'title', '_links'],
          },
        },
      },
    },
  },
  required: ['id', 'name', '_links'],
  additionalProperties: false,
};
```

### HAL Response Builder

```typescript
import Ajv from 'ajv';
const ajv = new Ajv();
const validateHalUser = ajv.compile(halUserSchema);

class HalBuilder {
  static user(user: any, baseUrl: string) {
    const halUser = {
      ...user,
      _links: {
        self: { href: `${baseUrl}/users/${user.id}` },
        edit: { href: `${baseUrl}/users/${user.id}` },
        posts: { href: `${baseUrl}/users/${user.id}/posts` },
      },
    };

    // Add embedded posts if available
    if (user.posts?.length) {
      halUser._embedded = {
        posts: user.posts.map((post) => ({
          ...post,
          _links: { self: { href: `${baseUrl}/posts/${post.id}` } },
        })),
      };
    }

    if (!validateHalUser(halUser)) {
      throw new Error('Invalid HAL resource');
    }

    return halUser;
  }
}

// Usage in Express
app.get('/users/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json(HalBuilder.user(user, baseUrl));
});
```

## 4. Testing Your Schemas (Because Bugs Hide in Edge Cases)

Don't just validate production data – test your schemas themselves:

```typescript
// schema-tests.ts
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { halUserSchema, userRegistrationSchema } from './schemas';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

describe('User Registration Schema', () => {
  const validate = ajv.compile(userRegistrationSchema);

  it('should accept valid user data', () => {
    const validUser = {
      username: 'johndoe123',
      email: 'john@example.com',
      password: 'SecurePass123!',
      age: 25,
    };

    expect(validate(validUser)).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      username: 'johndoe123',
      email: 'not-an-email',
      password: 'SecurePass123!',
      age: 25,
    };

    expect(validate(invalidUser)).toBe(false);
    expect(validate.errors).toContainEqual(
      expect.objectContaining({
        instancePath: '/email',
        message: 'must match format "email"',
      }),
    );
  });

  it('should reject weak password', () => {
    const invalidUser = {
      username: 'johndoe123',
      email: 'john@example.com',
      password: 'weak',
      age: 25,
    };

    expect(validate(invalidUser)).toBe(false);
  });

  it('should apply defaults', () => {
    const userData = {
      username: 'johndoe123',
      email: 'john@example.com',
      password: 'SecurePass123!',
      age: 25,
    };

    validate(userData);
    expect(userData.preferences?.newsletter).toBe(false);
    expect(userData.preferences?.theme).toBe('light');
  });
});

describe('HAL User Schema', () => {
  const validate = ajv.compile(halUserSchema);

  it('should accept valid HAL user', () => {
    const halUser = {
      id: 123,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: '2023-01-01T00:00:00.000Z',
      _links: {
        self: { href: '/users/123' },
        edit: { href: '/users/123' },
      },
    };

    expect(validate(halUser)).toBe(true);
  });

  it('should require _links.self', () => {
    const invalidHalUser = {
      id: 123,
      name: 'Alice',
      email: 'alice@example.com',
      _links: {
        edit: { href: '/users/123' },
      },
    };

    expect(validate(invalidHalUser)).toBe(false);
    expect(validate.errors).toContainEqual(
      expect.objectContaining({
        instancePath: '/_links',
        message: "must have required property 'self'",
      }),
    );
  });
});
```

## 5. Pro Tips for Production Success

### 1. Schema Versioning Strategy

```typescript
// Keep schemas versioned for backward compatibility
const schemas = {
  v1: {
    user: userSchemaV1,
    post: postSchemaV1,
  },
  v2: {
    user: userSchemaV2,
    post: postSchemaV2,
  },
};

function getValidator(resource: string, version: string = 'v2') {
  const schema = schemas[version]?.[resource];
  if (!schema) {
    throw new Error(`Schema not found: ${resource} v${version}`);
  }
  return ajv.compile(schema);
}
```

### 2. Performance Monitoring

```typescript
// Monitor validation performance
function createTimedValidator(schema: any, name: string) {
  const validate = ajv.compile(schema);

  return (data: any) => {
    const start = process.hrtime.bigint();
    const result = validate(data);
    const end = process.hrtime.bigint();

    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    console.log(`Validation ${name}: ${duration.toFixed(2)}ms`);

    return result;
  };
}
```

### 3. Schema Documentation Generation

```typescript
// Generate documentation from your schemas
function generateSchemaDoc(schema: any, title: string) {
  const doc = {
    title,
    properties: {},
    required: schema.required || [],
  };

  for (const [prop, definition] of Object.entries(schema.properties || {})) {
    doc.properties[prop] = {
      type: definition.type,
      description: definition.description || `${prop} field`,
      required: schema.required?.includes(prop) || false,
      example: generateExample(definition),
    };
  }

  return doc;
}
```

## Wrapping Up the Series

Congratulations! You've journeyed from JSON Schema basics to production-ready implementations. Here's what you've gained:

- **Part 1**: Understanding JSON Schema fundamentals and YAML compatibility
- **Part 2**: Mastering AJV implementation with advanced features and TypeScript integration
- **Part 3**: Real-world patterns including API validation, ETL pipelines, and HAL hypermedia APIs

### Your Next Steps

1. **Start Small**: Pick one use case (maybe API validation) and implement it
2. **Build Your Schema Library**: Create reusable schemas for your common data structures
3. **Test Everything**: Write tests for both your schemas and your validation logic
4. **Monitor Performance**: Keep an eye on validation performance in production
5. **Document Your Schemas**: Good schemas are self-documenting, but examples help

_You're now equipped to bring order to the chaos of unvalidated data. Go forth and validate with confidence!_ :rocket:

---

**Series Navigation:**

- [Part 1: Understanding the Basics](./JSON_Schema_Your_Datas_New_Best_Friend.md)
- [Part 2: Implementation with AJV](./JSON_Schema_with_AJV_Implementation_Deep_Dive.md)
- **Part 3: Real-World Applications & HAL** ← You are here

---

![JSON Schema](https://img.shields.io/badge/JSON_Schema-3949AB?style=flat-square&logo=json-schema&logoColor=white) ![API](https://img.shields.io/badge/API-🌐-blue?style=flat-square) ![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/JSON_Schema_in_the_Wild_Real_World_Applications__HAL.md)
