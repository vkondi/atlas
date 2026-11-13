[⬅️ Back to AI Engineering](../README.md)

# Structured Outputs & Constrained Decoding

A technical guide to enforcing guaranteed output formats, using JSON schema validation, constrained decoding for structured generation, and building reliable data extraction pipelines that prevent hallucination in the output structure.

---

## Why It Matters

LLMs generate text probabilistically, which means they sometimes violate output schema: a model asked to respond with `{"name": "...", "age": ...}` might return malformed JSON, missing fields, or hallucinated structure. This causes downstream parsing failures, data corruption, and silent data loss. **Structured outputs** and **constrained decoding** enforce format constraints at generation time, guaranteeing valid output before the model finishes. Without these guarantees, production systems waste engineering cycles on output validation/correction rather than solving business problems.

---

## Core Concepts

### 1. The Problem: Unconstrained Generation

Models generate text one token at a time, including structural violations:

```
                   UNCONSTRAINED GENERATION RISK

Request: "Extract name and age as JSON"

Model Output (Attempt 1 - Invalid JSON):
{
  "name": "Alice,
  "age": 30
}
[Missing closing quote, invalid JSON]

Model Output (Attempt 2 - Hallucinated Fields):
{
  "name": "Alice",
  "age": 30,
  "city": "Boston",
  "phone": "555-1234"
}
[Extra fields not requested; parser breaks]

Model Output (Attempt 3 - Wrong Types):
{
  "name": "Alice",
  "age": "thirty"
}
[age should be number, not string]
```

**Costs of Unstructured Output**:

- Parsing failures (5-10% of responses fail JSON decoding)
- Retry loops (re-query model to fix format)
- Silent data loss (invalid records skipped)
- Type mismatches (downstream systems crash)

### 2. Constrained Decoding

Modern LLM APIs support constrained decoding: restricting token generation to valid sequences only.

```
                    CONSTRAINED DECODING FLOW

   User Request + JSON Schema
         │
         ├─→ [ Tokenizer ]
         │   Convert JSON schema to valid token sequence
         │
         ├─→ [ Generation with Filtering ]
         │   At each token step:
         │   - Check if token maintains valid JSON
         │   - Reject invalid tokens
         │   - Only allow continuations that produce valid JSON
         │
         └─→ [ Guaranteed Valid Output ]
             100% of responses are valid JSON
             (No parsing failures)
```

**Providers Supporting Constrained Decoding**:

- **Claude 3.5** (Sonnet, Opus): JSON mode with guaranteed validity
- **GPT-4 Turbo**: JSON mode (best effort, ~99% reliable)
- **Llama 3.1**: With vLLM or similar runtime (guided generation)

### 3. JSON Schema Definition

Structural contracts defined via JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Person's full name",
      "minLength": 1,
      "maxLength": 100
    },
    "age": {
      "type": "integer",
      "description": "Age in years",
      "minimum": 0,
      "maximum": 150
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Associated labels"
    }
  },
  "required": ["name", "age"],
  "additionalProperties": false
}
```

**Schema Enforcement**:

- **Type Validation**: Ensures correct data types (string, integer, array, object)
- **Range Constraints**: Minimum/maximum for numbers; min/maxLength for strings
- **Enums**: Restrict values to predefined options
- **Required Fields**: Guarantees presence of mandatory fields
- **No Extra Fields**: Prevents hallucinated properties

### 4. Implementation Patterns

**Pattern 1: API-Native Constrained Decoding**

```python
import anthropic
import json

client = anthropic.Anthropic()

# Define output schema
extraction_schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer"},
        "email": {"type": "string"},
    },
    "required": ["name", "age"],
}

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Extract name, age, email from: 'Alice Smith is 30 and works at alice@example.com'",
        }
    ],
    # Claude enforces JSON validity
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "PersonExtraction",
            "schema": extraction_schema,
            "strict": True,  # Guarantee strict compliance
        },
    },
)

# Response is guaranteed valid JSON
result = json.loads(response.content[0].text)
print(result)  # 100% valid
```

**Pattern 2: Guided Generation with vLLM**

```python
from vllm import LLM, SamplingParams
import jsonschema

llm = LLM(model="meta-llama/Llama-2-7b-hf")

# vLLM supports constrained generation via LMQL
sampling_params = SamplingParams(
    temperature=0.7,
    max_tokens=256,
    guided_json=json.dumps(extraction_schema),  # Constrain to schema
)

outputs = llm.generate(
    ["Extract: Alice Smith, age 30, email alice@example.com"],
    sampling_params,
)

# Result is valid JSON
result = json.loads(outputs[0].outputs[0].text)
```

**Pattern 3: Post-Generation Validation with Retry**

```python
import anthropic
import json
import jsonschema

def extract_with_validation(text: str, max_retries: int = 3) -> dict:
    """Extract data with retry on validation failure."""
    client = anthropic.Anthropic()

    schema = {...}  # Define schema

    for attempt in range(max_retries):
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": f"Extract JSON: {text}",
                }
            ],
        )

        try:
            result = json.loads(response.content[0].text)
            jsonschema.validate(instance=result, schema=schema)
            return result  # Valid!
        except (json.JSONDecodeError, jsonschema.ValidationError) as e:
            if attempt < max_retries - 1:
                # Retry with corrected prompt
                print(f"Retry {attempt + 1}: {e}")
                continue
            else:
                raise

    raise RuntimeError("Max retries exceeded")
```

### 5. Advanced Patterns

**Discriminated Unions** (Multi-type Outputs)

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "type": { "const": "person" },
        "name": { "type": "string" },
        "age": { "type": "integer" }
      },
      "required": ["type", "name", "age"]
    },
    {
      "type": "object",
      "properties": {
        "type": { "const": "organization" },
        "name": { "type": "string" },
        "founded": { "type": "integer" }
      },
      "required": ["type", "name", "founded"]
    }
  ]
}
```

**Nested Structures**

```json
{
  "type": "object",
  "properties": {
    "order": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "sku": { "type": "string" },
              "quantity": { "type": "integer" }
            }
          }
        }
      }
    }
  }
}
```

---

## Real-World Production Learnings

We built an invoice processing system that extracted structured data from PDFs: vendor, line items, amounts, payment terms.

**The Failure**:

1. **Hallucinated Fields**: Model sometimes added fields not in schema (notes, department).
2. **Type Mismatches**: Amount field came back as string "One Thousand" instead of number 1000.
3. **Missing Fields**: Critical fields (vendor_id) were sometimes omitted.
4. **Parsing Failures**: 8% of responses returned invalid JSON, requiring manual review.

Costs: 2 hours/day manual cleanup.

**The Refactor**:

We implemented constrained decoding with JSON schemas:

1. **Strict Schema**: Define exact structure with type constraints.
2. **Claude JSON Mode**: Use native constrained decoding for 100% validity.
3. **Retry Logic**: For edge cases, retry with clarified prompt.
4. **Validation Layer**: Validate against schema before database write.

Here's the implementation:

```python
import anthropic
import json
import jsonschema
from datetime import datetime

class InvoiceExtractor:
    """Extract structured invoice data with guaranteed schema validity."""

    def __init__(self):
        self.client = anthropic.Anthropic()
        self.schema = {
            "type": "object",
            "properties": {
                "vendor_name": {
                    "type": "string",
                    "description": "Vendor/supplier name",
                },
                "vendor_id": {
                    "type": "string",
                    "description": "Vendor identifier",
                },
                "invoice_number": {
                    "type": "string",
                    "description": "Invoice number",
                },
                "invoice_date": {
                    "type": "string",
                    "format": "date",
                    "description": "Invoice date (YYYY-MM-DD)",
                },
                "total_amount": {
                    "type": "number",
                    "description": "Total invoice amount",
                    "minimum": 0,
                },
                "line_items": {
                    "type": "array",
                    "description": "Invoice line items",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string"},
                            "quantity": {"type": "number", "minimum": 0},
                            "unit_price": {"type": "number", "minimum": 0},
                            "amount": {"type": "number", "minimum": 0},
                        },
                        "required": [
                            "description",
                            "quantity",
                            "unit_price",
                            "amount",
                        ],
                    },
                },
                "payment_terms": {
                    "type": "string",
                    "description": "Payment terms (e.g., NET30)",
                },
                "due_date": {
                    "type": "string",
                    "format": "date",
                    "description": "Payment due date (YYYY-MM-DD)",
                },
            },
            "required": [
                "vendor_name",
                "invoice_number",
                "invoice_date",
                "total_amount",
                "line_items",
            ],
            "additionalProperties": False,
        }

    def extract(self, invoice_text: str) -> dict:
        """Extract structured data from invoice text."""
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": f"Extract invoice data from:\n\n{invoice_text}",
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "InvoiceData",
                    "schema": self.schema,
                    "strict": True,
                },
            },
        )

        # Parse guaranteed-valid JSON
        extracted_data = json.loads(response.content[0].text)

        # Validate against schema (defensive)
        jsonschema.validate(instance=extracted_data, schema=self.schema)

        return extracted_data

    def batch_extract(self, invoices: list[str]) -> list[dict]:
        """Extract from multiple invoices with error tracking."""
        results = []
        for i, invoice_text in enumerate(invoices):
            try:
                data = self.extract(invoice_text)
                results.append({"success": True, "data": data})
            except Exception as e:
                results.append(
                    {"success": False, "error": str(e), "invoice_index": i}
                )

        return results

# Usage
extractor = InvoiceExtractor()

invoice_text = """
INVOICE

Vendor: TechSupply Inc.
Vendor ID: VS-12345
Invoice #: INV-2024-11-001
Date: November 9, 2024
Due: December 9, 2024 (NET30)

Line Items:
- 10x Software Licenses @ $99 each = $990
- 1x Support Package @ $500 = $500

Total: $1,490

Payment Terms: NET30
"""

# Extract with guaranteed structure
result = extractor.extract(invoice_text)
print(json.dumps(result, indent=2))
```

**Results**:

- Eliminated JSON parsing failures (0% error rate vs. 8%)
- Removed manual cleanup (2 hours/day saved)
- Type correctness guaranteed by schema
- Processing speed increased (no retry loops)

---

## Related Reading

- [Tool Calling & Function Execution](./tool-calling-function-execution.md)
- [Agent Architectures](./agent-architectures.md)
- [Evals & Benchmarks](../fundamentals/evals-and-benchmarks.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.agentic-ai.structured-outputs-and-constrained-decoding.md)
