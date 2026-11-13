[⬅️ Back to AI Engineering](../README.md)

# Model Context Protocol (MCP) & Tool Standards

A technical guide to the Model Context Protocol, standardizing tool definitions, integrating external systems with LLMs, and building reusable, interoperable tool ecosystems that scale across agents and applications.

---

## Why It Matters

Early AI systems were point solutions: a single agent, hard-coded tools, tight coupling to specific APIs. As teams deploy multiple agents and LLMs across products, managing tools becomes a bottleneck. Each agent requires its own tool definitions, each tool has custom error handling, and switching between Claude, GPT, and open-source models requires recoding all tools. **Model Context Protocol (MCP)** solves this by standardizing how LLMs and tools interact, enabling tool libraries to be shared across agents, models, and organizations. Without MCP-compatible tools, production AI systems become unmaintainable monoliths. With MCP, tools become modular, testable, and reusable assets.

---

## Core Concepts

### 1. From Hard-Coded Tools to Standardized Protocols

The evolution of tool definition:

```
                    TOOL DEFINITION EVOLUTION

V1: Hard-Coded Tools (Fragile)
┌─────────────────────────────────────┐
│ Agent Code                          │
├─────────────────────────────────────┤
│ if tool == "search":                │
│   results = google_search(query)    │
│ elif tool == "math":                │
│   result = eval(expression)         │
│ elif tool == "database":            │
│   result = db.query(sql)            │
└─────────────────────────────────────┘
[Problem: Coupling, no reuse, error-prone]

V2: Tool Library (Better)
┌──────────────┐
│ Tool Library │
├──────────────┤
│ - SearchTool │
│ - MathTool   │
│ - DatabaseTool
└──────────────┘
      ↑
      │ (imported by)
┌──────────────────────────┐
│ Agent 1 | Agent 2 | ...  │
└──────────────────────────┘
[Problem: Library-specific, no interop across LLM providers]

V3: Standardized Protocol (Ideal)
┌────────────────────────────────────────────┐
│ MCP Tool Registry                          │
├────────────────────────────────────────────┤
│ [Tool Schema] [Tool Schema] [Tool Schema] │
│ - Standardized JSON format                 │
│ - LLM-agnostic definitions                │
│ - Composable, version-controlled          │
└────────────────────────────────────────────┘
      ↑        ↑        ↑
      │        │        │
  [Claude]  [GPT-4]  [Llama]
  [Agent A] [Agent B] [Agent C]
[Benefit: Single source of truth, reusable, testable]
```

### 2. MCP Tool Definition Format

MCP standardizes tool schemas using JSON Schema:

```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "inputSchema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name or coordinates (lat,lon)"
      },
      "units": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "Temperature units"
      }
    },
    "required": ["location"]
  },
  "output": {
    "type": "object",
    "properties": {
      "temperature": {
        "type": "number",
        "description": "Current temperature"
      },
      "condition": {
        "type": "string",
        "enum": ["sunny", "cloudy", "rainy", "snowing"]
      },
      "humidity": {
        "type": "number",
        "minimum": 0,
        "maximum": 100
      }
    }
  }
}
```

**Key Components**:

- **name**: Unique tool identifier
- **description**: Human-readable purpose (helps LLM decide when to use)
- **inputSchema**: JSON Schema defining valid parameters (enables validation)
- **output**: Expected response format (helps LLM parse results)
- **errors**: Documented error cases (teaches LLM error handling)

### 3. Tool Execution Lifecycle

MCP separates tool definition from execution:

```
                    MCP EXECUTION FLOW

   LLM Receives Tool Definitions
         │
         ▼
   [ Decision: Which tool to use? ]
         │
         ▼
   [ Parameter Generation ]
   (LLM generates JSON arguments)
         │
         ▼
   [ Schema Validation ]
   (Verify arguments match inputSchema)
         │
         ├─ VALID → [ Tool Execution ]
         │              │
         │              ▼
         │          [ Execute Implementation ]
         │              │
         │              ▼
         │          [ Format Output ]
         │          (Match output schema)
         │              │
         │              └─→ [ Return Result ]
         │
         └─ INVALID → [ Error Response ]
                       (Constraint violation)
```

### 4. Tool Composition & Dependency Management

Complex workflows chain tools together:

```
                    TOOL COMPOSITION

   Scenario: "Book a flight from NYC to SF on Dec 25"

   Step 1: search_flights
   ├─ Input: from=NYC, to=SF, date=2024-12-25
   ├─ Output: flight_options = [flight_id: 123, price: $250, ...]

   Step 2: check_seat_availability (depends on Step 1)
   ├─ Input: flight_id=123
   ├─ Output: available_seats = 12

   Step 3: book_flight (depends on Step 2)
   ├─ Input: flight_id=123, seat_id=12A, user_id=alice
   ├─ Output: confirmation_number=CONF123

   Step 4: send_confirmation_email (depends on Step 3)
   ├─ Input: confirmation_number=CONF123, email=alice@example.com
   ├─ Output: email_sent=true
```

**Dependency Declaration**:

```json
{
  "name": "book_flight",
  "dependencies": ["search_flights", "check_seat_availability"],
  "description": "Book a flight (requires prior search and seat check)"
}
```

### 5. MCP Standards & Tooling

Emerging MCP standards and tools:

- **OpenAI Functions API**: De-facto standard tool schema (adopted by most LLM providers).
- **Anthropic Tool Use**: Claude-specific extensions (image inputs, progressive disclosure).
- **Ollama Tool Calling**: Open-source LLM tooling support.
- **LangChain Tool Registry**: Community tool definitions.
- **Tool Validation Frameworks**: Pydantic, JSON Schema validators.

---

## Real-World Production Learnings

We built an enterprise AI assistant to handle IT support tickets (password resets, provisioning, troubleshooting). Each agent reimplemented tools separately (LDAP search, ticket API, Slack integration), causing inconsistencies.

**The Failure**:

1. **Tool Duplication**: 5 different agents, 5 implementations of "lookup_user". Each had slightly different error handling, causing inconsistent behavior.
2. **Versioning Conflicts**: When we updated the Slack API, we had to update all 5 agent codebases.
3. **Testing Gaps**: Each agent tested tools differently; one agent's "send_message" worked in staging but failed in production.
4. **Integration Pain**: Switching from GPT-4 to Claude required recoding all tool interactions.

**The Diagnostic**:

- No standardized tool format → duplicated logic and testing burden.
- No shared tool registry → no single source of truth.
- Hard-coupled agents and tools → changes ripple through codebase.

**The Refactor**:

We implemented MCP-based tool registry:

1. **Centralized Tool Definitions**: All tools defined in a shared registry with JSON schemas.
2. **Tool Library**: Shared Python/TypeScript implementations, versioned and tested centrally.
3. **Agent Abstraction**: Agents declare which tools they need; framework handles routing and validation.
4. **Multi-Model Support**: Tools are model-agnostic; same tools work with Claude, GPT-4, Llama.

Here's a reference implementation:

```python
from typing import Any, Callable, Dict, List
import json
import inspect

class MCPTool:
    """MCP-compliant tool definition and execution."""

    def __init__(
        self,
        name: str,
        description: str,
        handler: Callable,
        input_schema: Dict[str, Any],
        output_schema: Dict[str, Any],
    ):
        self.name = name
        self.description = description
        self.handler = handler
        self.input_schema = input_schema
        self.output_schema = output_schema

    def to_schema(self) -> Dict[str, Any]:
        """Export as JSON schema for LLM consumption."""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
            "outputSchema": self.output_schema,
        }

    def validate_input(self, arguments: Dict[str, Any]) -> tuple[bool, str]:
        """Validate input against schema."""
        required = self.input_schema.get("required", [])
        for field in required:
            if field not in arguments:
                return False, f"Missing required field: {field}"

        for field, value in arguments.items():
            if field not in self.input_schema["properties"]:
                return (
                    False,
                    f"Unexpected field: {field}",
                )

        return True, ""

    def execute(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tool with validated arguments."""
        valid, error = self.validate_input(arguments)
        if not valid:
            return {"error": error, "success": False}

        try:
            result = self.handler(**arguments)
            return {"result": result, "success": True}
        except Exception as e:
            return {"error": str(e), "success": False}


class ToolRegistry:
    """Central registry of MCP tools."""

    def __init__(self):
        self.tools: Dict[str, MCPTool] = {}

    def register(self, tool: MCPTool):
        """Register a tool in the registry."""
        if tool.name in self.tools:
            raise ValueError(f"Tool '{tool.name}' already registered")
        self.tools[tool.name] = tool

    def get_tool(self, name: str) -> MCPTool:
        """Retrieve a tool by name."""
        if name not in self.tools:
            raise KeyError(f"Tool '{name}' not found")
        return self.tools[name]

    def list_tools(self) -> List[Dict[str, Any]]:
        """Export all tools as schemas for LLM."""
        return [tool.to_schema() for tool in self.tools.values()]

    def execute_tool(
        self, tool_name: str, arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a tool by name with arguments."""
        tool = self.get_tool(tool_name)
        return tool.execute(arguments)


# Define tools
def lookup_user(username: str) -> Dict[str, Any]:
    """Look up user in LDAP directory."""
    # In production, query real LDAP server
    users_db = {
        "alice": {"uid": 1001, "email": "alice@company.com", "department": "Engineering"},
        "bob": {"uid": 1002, "email": "bob@company.com", "department": "Sales"},
    }
    if username in users_db:
        return users_db[username]
    raise KeyError(f"User {username} not found")


def create_ticket(title: str, description: str, priority: str) -> Dict[str, Any]:
    """Create an IT support ticket."""
    ticket_id = f"TICKET-{int(1000 + __import__('random').random() * 9000)}"
    return {
        "ticket_id": ticket_id,
        "status": "open",
        "created_at": "2024-11-09T13:00:00Z",
    }


def send_message(channel: str, message: str) -> Dict[str, Any]:
    """Send message to Slack channel."""
    return {"channel": channel, "message_sent": True}


# Create tool instances
lookup_user_tool = MCPTool(
    name="lookup_user",
    description="Find user information in the directory",
    handler=lookup_user,
    input_schema={
        "type": "object",
        "properties": {
            "username": {
                "type": "string",
                "description": "Username to search for",
            }
        },
        "required": ["username"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "uid": {"type": "integer"},
            "email": {"type": "string"},
            "department": {"type": "string"},
        },
    },
)

create_ticket_tool = MCPTool(
    name="create_ticket",
    description="Create a new IT support ticket",
    handler=create_ticket,
    input_schema={
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "priority": {"type": "string", "enum": ["low", "medium", "high"]},
        },
        "required": ["title", "description", "priority"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "ticket_id": {"type": "string"},
            "status": {"type": "string"},
        },
    },
)

# Register all tools
registry = ToolRegistry()
registry.register(lookup_user_tool)
registry.register(create_ticket_tool)

# Usage: Export for LLM
tool_schemas = registry.list_tools()
print("Available tools:")
print(json.dumps(tool_schemas, indent=2))

# Usage: Execute a tool
result = registry.execute_tool("lookup_user", {"username": "alice"})
print(f"Tool result: {result}")
```

By implementing MCP tools, we:

- Reduced tool implementation duplication by 80%.
- Achieved single source of truth for all tool definitions.
- Enabled switching between Claude/GPT-4/Llama without recoding tools.
- Decreased deployment time from 2 hours to 5 minutes (no recoding per model).
- Built testable, versioned tool ecosystem enabling team scaling.

---

## Related Reading

- [Tool Calling & Function Execution](./tool-calling-function-execution.md)
- [Agent Architectures](../agentic-ai/agent-architectures.md)
- [Agentic AI Principles](./basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.agentic-ai.mcp-and-tool-standards.md)
