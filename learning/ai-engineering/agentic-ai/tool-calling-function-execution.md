[⬅️ Back to AI Engineering](../README.md)

# Tool Calling & Function Execution

An engineering guide to defining JSON Schema interfaces for LLM tool calling, managing execution loops, handling parameter hallucinations, and securing execution boundaries.

---

## Why It Matters

LLMs are inherently isolated from the external world. To make them useful in production, we must allow them to interact with external systems—such as databases, web search, or application APIs. This is achieved via **Tool Calling**, where the model generates structured, machine-readable arguments (JSON) instead of natural language, indicating which local function to invoke. If an engineer executes these generated payloads without strict schema validation, type checks, and security boundaries, they will expose their APIs to remote code execution, database injections, and validation crashes.

---

## Core Concepts

### 1. The Tool Calling Execution Cycle

Tool calling is not the model running code; it is a collaborative cycle managed entirely by the client-side application:

```
                     TOOL CALLING PROTOCOL

         Client App                         LLM Engine
             │                                  │
             ├────── [ System + Tools ] ───────>│ (Model decides to
             │       [ User Prompt    ]         │  use "get_weather")
             │                                  │
             |<── [ Tool Call Request ] ────────┤ (Returns Tool ID,
             │    (JSON: {"location": "SF"})    │  Function & Args)
             │                                  │
      (App executes                             │
      get_weather("SF"))                        │
             │                                  │
             ├───────── [ Tool Output ] ───────>│ (Model synthesizes
             │          (JSON: "65°F, Sunny")   │  final response)
             │                                  │
             |<─────── [ Final Answer ] ────────┤
             ▼                                  ▼
```

1. **Interface Exposure**: The client application sends the system instructions, the user prompt, and a list of tool definitions (JSON Schemas outlining function names, parameters, descriptions, and required fields) to the LLM.
1. **Decision and Extraction**: The LLM parses the prompt. If it needs external data, it returns a structural response specifying `tool_calls` with unique IDs, target function names, and stringified JSON arguments.
1. **Execution and Injection**: The client application parses the JSON arguments, executes the local code handler, captures the output string, and sends it back to the LLM as a new role type (`tool`).
1. **Synthesis**: The LLM reads the tool output observation and outputs a natural language summary or continues the loop if additional tools are needed.

### 2. Parameter Hallucination & Parsing Defense

LLMs frequently struggle with precise JSON syntax and parameter consistency:

- **JSON Syntax Malformations**: The model may output invalid JSON strings (missing commas, quotes, or trailing characters). The client parser must intercept these using regular expression cleaning or fallback parsers.
- **Argument Hallucinations**: The model may invent parameters that are not defined in the JSON Schema (e.g., passing `zip_code` when the schema only accepts `city`). The application must strip unexpected fields and enforce strict schemas.
- **Type Mismatches**: The model may pass a string `"120"` to a parameter expecting a number. The code must handle automatic type coercion.

---

## Real-World Production Learnings

We built an automated customer service assistant integrated with our CRM system (Salesforce API). We exposed a tool called `patch_customer_record` allowing the agent to update database fields like customer phone numbers or mailing addresses.

**The Failure**:
During operations, the agent was requested to update a customer's address. The LLM generated a tool call request. However, instead of passing a simple string, it hallucinated the parameter structure and passed an address object containing nested structures.

Furthermore, on another turn, when given an adversarial input, the model was tricked into generating a SQL injection command as the client parameter. Because our CRM integration module directly executed the generated payload without validation, it triggered a series of database crashes and SQL syntax exceptions.

**The Diagnostic**:

1. **No Client-Side Validation**: The client application blindly forwarded the model's generated JSON payload to our backend API endpoints.
2. **Lack of Type Safety**: We did not enforce type checks on parameters at compile-time or run-time before hitting our integration clients.

**The Refactor**:
We introduced a structured validation pipeline using **Zod** schemas:

1. **Zod Validator Interceptor**: We wrapped all tool execution handlers in Zod schema guard blocks. The generated arguments are validated at runtime before calling external services.
2. **Schema Sanitization**: Any hallucinated parameters are automatically stripped, and values are coerced to the correct type.
3. **Execution Guardrails**: If validation fails, we automatically return the validation error back to the LLM, prompting it to self-correct the parameters.

Here is the TypeScript implementation of our validated tool calling runner:

```typescript
// Validated Tool Calling Runner with Zod Guards
import { z } from 'zod';

// 1. Define strict type schemas for our CRM tools
const PatchCustomerSchema = z.object({
  customerId: z.string().uuid(),
  updateFields: z
    .object({
      phone: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/)
        .optional(),
      address: z.string().max(255).optional(),
      email: z.string().email().optional(),
    })
    .strict(), // Strict blocks hallucinated parameters
});

type PatchCustomerArgs = z.infer<typeof PatchCustomerSchema>;

// Tool execution registry
export class CRMToolRegistry {
  // Define tool schema JSON format to send to OpenAI
  public getToolDefinition() {
    return {
      type: 'function',
      function: {
        name: 'patch_customer_record',
        description:
          'Updates specific profile fields on a customer CRM record.',
        parameters: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              format: 'uuid',
              description: 'The unique customer UUID.',
            },
            updateFields: {
              type: 'object',
              properties: {
                phone: {
                  type: 'string',
                  description: 'E.164 phone number format.',
                },
                address: { type: 'string', description: 'Mailing address.' },
                email: { type: 'string', description: 'Valid email address.' },
              },
              required: [],
            },
          },
          required: ['customerId', 'updateFields'],
        },
      },
    };
  }

  // Guarded tool runner
  public async executeTool(rawArguments: string): Promise<string> {
    let parsedJson: any;

    // 1. Safe JSON Parse Guard
    try {
      parsedJson = JSON.parse(rawArguments);
    } catch (e: any) {
      return JSON.stringify({
        status: 'ERROR',
        message: `Invalid JSON argument format: ${e.message}. Please generate clean JSON.`,
      });
    }

    // 2. Runtime Schema Validation Guard
    const validationResult = PatchCustomerSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      // Return validation errors back to LLM to trigger self-correction
      const errorDetails = validationResult.error.issues
        .map((issue) => `Field "${issue.path.join('.')}": ${issue.message}`)
        .join('; ');

      console.warn(`Tool validation failed: ${errorDetails}`);
      return JSON.stringify({
        status: 'VALIDATION_FAILED',
        message: `Arguments violated schema requirements: ${errorDetails}. Please correct parameter values.`,
      });
    }

    // 3. Secure Execution (Safe from SQL/NoSQL injection)
    const sanitizedArgs = validationResult.data;
    return await this.updateCRMDatabase(sanitizedArgs);
  }

  private async updateCRMDatabase(args: PatchCustomerArgs): Promise<string> {
    // In production, execute parameterized query to update Salesforce/Postgres
    console.log(
      `[Database Write] Customer ${args.customerId} successfully updated.`,
    );
    return JSON.stringify({
      status: 'SUCCESS',
      message: `Customer record ${args.customerId} updated fields: ${Object.keys(args.updateFields).join(', ')}.`,
    });
  }
}
```

By adding a Zod-based schema parser layer, our backend integration endpoints are fully shielded. Hallucinated parameters are blocked, malformed types are safely coerced, and incorrect phone number formats or SQL-injection injection payloads are rejected before database execute steps occur.

---

## Related Reading

- [Agentic AI Basics](./basics.md)
- [JSON Schema Validation](../../databases/data-modeling/basics.md)
- [Application Security Basics](../../security/application-security/basics.md)

---

### 📖 Related Blog Posts

- [Ref: So I Built This AI Thing That Doesnt Suck](../../../blogs/So_I_Built_This_AI_Thing_That_Doesnt_Suck.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.agentic-ai.tool-calling-function-execution.md)
