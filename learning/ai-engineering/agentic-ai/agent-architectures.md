[⬅️ Back to AI Engineering](../README.md)

# Agent Architectures

A technical analysis of single-agent and multi-agent structural topologies, covering plan-and-execute engines, reflection feedback loops, and state-machine-driven DAG execution.

---

## Why It Matters

When building early-stage AI tools, engineers often rely on a single, open-ended agent loop that handles planning, tool execution, and self-evaluation in a single linear context. As task complexity scales, this simple approach breaks: the LLM's context window fills with tool output logs, attention drifts, and the agent loses track of the primary goal, leading to erratic decisions or repetitive execution loops. To handle complex workflows, we must partition agent responsibility across structured architectures, isolating planning, execution, and evaluation states.

---

## Core Concepts

### 1. Architectural Archetypes

- **Single-Agent Task Runner**: An LLM wrapped in a basic read-eval-print-loop (REPL) that runs until the final output is generated. Best for narrow, interactive, and short-context workflows.
- **Router-Based Selector**: An initial classifier model evaluates user intent and routes the query to a specialized, isolated sub-agent or tool. This keeps the execution context focused, reducing token overhead.
- **Plan-and-Execute Engine**: Separates planning from execution:
  1. A **Planner** decomposes a complex user goal into a static checklist of sub-tasks.
  2. An **Executor** executes the sub-tasks sequentially using tools, outputting results.
  3. A **Re-Planner** evaluates the execution results against the original checklist, adapting or adding steps if failures occur.
- **Generator-Evaluator Reflection Loop**: A dual-node loop where a Generator creates an initial output (e.g., source code), and an Evaluator inspects it (e.g., compiles it, runs a linter, or checks unit tests), feeding a structural critique back to the Generator for refinement.

```
                    GENERATOR-EVALUATOR REFLECTION

                       [ Input Prompt ]
                              │
                              ▼
                      ┌──────────────┐
               +====> │  GENERATOR   │
               │      └──────┬───────┘
               │             ▼  [ Draft Output ]
               │      ┌──────────────┐
               │      │  EVALUATOR   │ (Runs tests/verification)
               │      └──────┬───────┘
               │             │  [ Test Passes? ]
               │             ├─────────────────┐
               │             ▼  No             ▼  Yes
               └──────[ Critique ]      [ Final Output ]
```

### 2. State Machines & DAGs (Directed Acyclic Graphs)

To prevent agents from wandering, state-of-the-art frameworks (like LangGraph, CrewAI, or custom engines) define agents as **State Machines** or **DAGs**:

- **Nodes**: Represent compute steps or LLM prompts (e.g., `DraftCode`, `ExecuteTests`, `RefineCode`).
- **Edges**: Define transition paths between nodes (e.g., transferring control from `ExecuteTests` back to `RefineCode` if tests fail).
- **State**: A shared, version-controlled object passed across nodes. Each node reads the state, executes its task, and appends its updates, preventing context loss.

---

## Real-World Production Learnings

We built an automated GitHub Pull Request refactoring agent to identify code smells, write unit tests, and resolve compilation warnings.

**The Failure**:
Originally, we built this using a single-agent loop. The agent checked out the branch, read the file, ran tests, read compiler errors, and wrote code inline. During execution, if a compiler error was returned, the agent appended the 100-line stack trace to its context.

After 3 iterations, its context window grew saturated with compiler logs. The model forgot the original goal, started refactoring completely unrelated parts of the file, introduced syntax bugs in other classes, and eventually crashed due to context exhaustion.

**The Diagnostic**:

1. **State Contamination**: Mixing compiler logs, filesystem tools, and high-level architectural plans in a single chat history polluted the attention weights.
2. **Linear Reasoning Failure**: The agent was trying to debug code while simultaneously keeping track of its checklist, leading to logical degradation.

**The Refactor**:
We split the single agent into a **Plan-and-Execute DAG** containing three distinct states:

1. **Planner Node**: Analyzes the PR diff and returns a list of target sub-tasks. It stores this list in the shared state.
2. **Executor Node (Coding Agent)**: Operates within a clean context. It reads one task from the shared state, views the target file, applies the code change, and writes it back. It does not see compiler runs.
3. **Validator Node (QA Agent)**: Runs the compiler and unit tests. If a compile error occurs, it maps the exact line and error message, pushes it to the shared state, and routes control back to the Executor node (loop capped at 3 retries).

Here is the implementation of our custom DAG state router:

```typescript
// Directed Agentic Refactoring State Machine Router
import { execSync } from 'child_process';

interface RefactorState {
  filePath: string;
  tasks: string[];
  currentTaskIndex: number;
  compilerErrors?: string;
  refactoredContent?: string;
  retryCount: number;
}

export class RefactorDAGRouter {
  public async runRefactorPipeline(filePath: string): Promise<void> {
    const state: RefactorState = {
      filePath,
      tasks: [],
      currentTaskIndex: 0,
      retryCount: 0,
    };

    // Transition 1: Planning Node
    state.tasks = await this.plannerNode(state.filePath);

    // Iterative Execution Loop
    while (state.currentTaskIndex < state.tasks.length) {
      console.log(
        `Processing task ${state.currentTaskIndex + 1}/${state.tasks.length}`,
      );

      // Transition 2: Execution Node
      await this.executorNode(state);

      // Transition 3: Validation Node
      const isValid = this.validatorNode(state);

      if (isValid) {
        state.currentTaskIndex++;
        state.retryCount = 0;
        state.compilerErrors = undefined;
      } else {
        state.retryCount++;
        if (state.retryCount >= 3) {
          throw new Error(
            `Failed to resolve compiler errors for task at index ${state.currentTaskIndex} after 3 attempts.`,
          );
        }
        console.warn(
          `Validation failed. Routing back to Executor with compiler trace. Retry: ${state.retryCount}`,
        );
      }
    }

    console.log('PR Refactoring pipeline completed successfully.');
  }

  private async plannerNode(filePath: string): Promise<string[]> {
    // Queries LLM to analyze the file and return a structured array of discrete tasks
    return [
      'Refactor slow array iterations to use Maps.',
      'Add JSDoc typings to export functions.',
    ];
  }

  private async executorNode(state: RefactorState): Promise<void> {
    const activeTask = state.tasks[state.currentTaskIndex];
    console.log(`Executing Task: "${activeTask}"`);

    // In production, query LLM passing ONLY the target file content, the active task,
    // and compilerErrors (if any). This keeps context clean.
    const prompt = `Task: ${activeTask}.
Filesystem: ${state.filePath}.
Errors: ${state.compilerErrors || 'None'}.`;

    // Simulate LLM file modification output
    state.refactoredContent = `// Modified code matching task requirements`;
  }

  private validatorNode(state: RefactorState): boolean {
    try {
      // Simulate running typescript compiler and unit tests
      execSync('tsc --noEmit', { stdio: 'pipe' });
      return true;
    } catch (error: any) {
      state.compilerErrors = error.stdout?.toString() || error.message;
      return false;
    }
  }
}
```

By decoupling the execution step from validation and planning, our contexts remained small, focused, and secure. The coding agent received clear instruction payloads containing only the code and compile errors, eliminating attention drift and resulting in a **100% compile success rate** for automated modifications.

---

## Related Reading

- [Agentic AI Basics](./basics.md)
- [Multi-Agent Orchestration](./multi-agent-orchestration.md)
- [Local Development & Git Workflows](../../tooling-and-workflows/local-development/basics.md)

---

### 📖 Related Blog Posts

- [Ref: Everyones Building AI Agents Heres the One I Built for Myself](../../../blogs/Everyones_Building_AI_Agents_Heres_the_One_I_Built_for_Myself.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.agentic-ai.agent-architectures.md)
