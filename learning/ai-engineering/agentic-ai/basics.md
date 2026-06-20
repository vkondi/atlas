[⬅️ Back to AI Engineering](../README.md)

# Agentic AI Basics

A technical guide to agentic design patterns, covering autonomous loops (ReAct/OODA), state management abstractions, memory architectures, and safety-critical execution constraints.

---

## Why It Matters

Standard LLM integrations operate on a simple request-response lifecycle: the user sends a prompt, and the model generates a response in a single step. While effective for simple writing, this stateless model fails at complex tasks like multi-step coding, data analysis, or system troubleshooting. Agentic systems bridge this gap by wrapping LLMs in an active execution loop, allowing them to formulate plans, invoke external tools, inspect outcomes, and correct their own errors. However, building agent loops without strict loop limits, state tracking, and permission sandboxes leads to infinite execution loops, runaway API costs, and accidental data corruption.

---

## Core Concepts

### 1. What Defines an Agent?

An agent is an autonomous software entity that uses an LLM as its central reasoning engine to navigate an environment. Unlike deterministic pipelines, an agent decides its own execution path dynamically. The system architecture consists of:

- **The Brain (LLM)**: Governs reasoning, intent parsing, planning, and evaluation.
- **The State / Memory**: Stores execution history, goals, variable bindings, and environmental feedback.
- **The Tools**: Actuators enabling the agent to affect the external environment (e.g., executing code, querying databases, fetching web pages).

### 2. The Core Agent Loop (ReAct / OODA)

Agents execute actions sequentially within a logical loop. The most prominent loop structures are:

- **Observe-Orient-Decide-Act (OODA)**: Adapted from military strategy, this cycle focuses on continuous observation and fast loop adjustment based on dynamic environmental signals.
- **Reasoning and Acting (ReAct)**: A pattern combining thinking (Thought) and actions (Action). By writing out thoughts before actions, the model calculates intermediate reasoning, reducing errors.

```
                              AGENT LOOP

                              [ Goal Set ]
                                   │
                                   ▼
                            ┌─────────────┐
                        +==>│  PLANNING   │ (Evaluate history, devise next steps)
                        │   └──────┬──────┘
                        │          ▼
                        │   ┌─────────────┐
                        │   │  EXERTION   │ (Invoke selected tool)
                        │   └──────┬──────┘
                        │          ▼
                        │   ┌─────────────┐
                        │   │ OBSERVATION │ (Capture output and log failures)
                        │   └──────┬──────┘
                        +==========+ (Loop until completion criteria are met)
                                   │
                                   ▼
                              [ Completed ]
```

### 3. Agent Memory Architectures

To make coherent decisions over time, agents implement multi-tiered memory layers:

- **Short-Term Memory**: Stored in-context as the active conversation history thread. Because context windows are finite and expensive, older segments are dynamically pruned, summarized, or compressed using rolling summaries.
- **Long-Term Memory**: Stored out-of-context in external databases. This is typically implemented as a Vector Database where past experiences, successful tool invocations, or broad domain knowledge are indexed and retrieved via semantic similarity queries.
- **Procedural Memory**: Hardcoded system prompt templates, task guidelines, and tool schemas outlining how the agent must operate.

---

## Real-World Production Learnings

We built an internal database diagnostic agent. The agent had read/write credentials to a PostgreSQL staging database, with instructions to analyze slow queries, recommend indexes, and apply migrations to optimize catalog response times.

**The Failure**:
During a testing session, the agent attempted to fix a missing index on a heavy table. It generated a malformed SQL statement containing a syntax error. When the database returned a syntax exception, the agent entered an **infinite self-correction loop**, attempting to fix the SQL syntax, failing, reading the error message, and attempting the write again.

It executed over **1,200 sequential queries in 45 minutes**, pinning DB CPU to 100% and generating a Cartesian product join query that exhausted system storage, crashing the staging database.

**The Diagnostic**:

1. **No Loop Thresholds**: The outer agent execution script did not have a maximum loop limit or escape mechanism.
2. **Infinite Error Loops**: The agent was fed the raw PostgreSQL error log. When it failed, it simply fed the same context back to the model, which generated slight variations of the same malformed syntax.
3. **No Timeout Protections**: The database driver was configured with a default query timeout of 0 (infinite), allowing the agent's malformed join queries to run indefinitely.

**The Refactor**:
We redesigned our agent execution loop to enforce runtime constraints and prevent runaway loops:

1. **Max Iteration Guard**: We wrapped the agent loop in a class that strictly limits execution to a maximum of 5 iterations before throwing a fatal exit error.
2. **Statement Timeout Constraints**: We configured a strict `statement_timeout` at the PostgreSQL client level, terminating any query taking longer than 2000ms.
3. **Loop Duplication Detector**: We added a hash-based state tracker. If the agent generates the exact same action output twice in a row, the loop is aborted immediately.

Here is the implementation of our bounded agent loop controller:

```typescript
// Bounded Agent Loop Controller with State Guardrails
import { Client } from 'pg';

interface Tool {
  name: string;
  execute(args: any): Promise<string>;
}

export class BoundedAgentLoopController {
  private maxIterations = 5;
  private dbClient: Client;
  private stateHistory: Set<string> = new Set();

  constructor(dbClient: Client) {
    this.dbClient = dbClient;
  }

  public async executeAgentLoop(
    goal: string,
    agentEngine: (history: string[]) => Promise<{ action: string; args: any }>,
  ): Promise<string> {
    const executionHistory: string[] = [`GOAL: ${goal}`];
    let iterationCount = 0;

    // Enforce statement timeout at database level for connection session
    await this.dbClient.query("SET statement_timeout = '2000'");

    while (iterationCount < this.maxIterations) {
      iterationCount++;
      console.log(
        `Executing loop iteration ${iterationCount}/${this.maxIterations}`,
      );

      // 1. Generate next step from LLM
      const { action, args } = await agentEngine(executionHistory);

      // 2. Prevent infinite loops by detecting repeated actions (Hash-Based Detection)
      const actionHash = `${action}:${JSON.stringify(args)}`;
      if (this.stateHistory.has(actionHash)) {
        throw new Error(
          `Execution aborted: Infinite loop detected on action "${action}".`,
        );
      }
      this.stateHistory.add(actionHash);

      // 3. Process execution
      if (action === 'COMPLETE') {
        return args.result;
      }

      if (action === 'EXECUTE_SQL') {
        const queryText = args.sql;
        let observation = '';

        try {
          // Guarded DB execution with strict system limits
          const res = await this.dbClient.query(queryText);
          observation = `SUCCESS: Modified ${res.rowCount} rows. Query returned: ${JSON.stringify(res.rows.slice(0, 5))}`;
        } catch (error: any) {
          observation = `DATABASE ERROR: ${error.message}`;
        }

        console.log(`Action Outcome: ${observation}`);
        executionHistory.push(`ACTION: ${action} with SQL [${queryText}]`);
        executionHistory.push(`OBSERVATION: ${observation}`);
      } else {
        throw new Error(`Unsupported agent action: ${action}`);
      }
    }

    throw new Error(
      `Agent failed to resolve goal within ${this.maxIterations} iterations limit.`,
    );
  }
}
```

By constraining the agent to a maximum of 5 loops, enforcing database statement timeouts, and checking for action repetition, we prevented the agent from running away or saturating database resources. When a query fails, the agent either self-corrects within 2 attempts or safely escalates to a human operator without causing system downtime.

---

## Related Reading

- [Agent Architectures](./agent-architectures.md)
- [Tool Calling & Function Execution](./tool-calling-function-execution.md)
- [PostgreSQL Features & Optimizations](../../databases/relational/postgresql-features.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.agentic-ai.basics.md)
