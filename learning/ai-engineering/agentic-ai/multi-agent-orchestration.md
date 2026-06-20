[⬅️ Back to AI Engineering](../README.md)

# Multi-Agent Orchestration

An architectural analysis of multi-agent coordination models, state transfer protocols, collaboration topologies, and defensive patterns to mitigate multi-agent execution loops.

---

## Why It Matters

While single-agent plan-and-execute models can handle medium-sized tasks, they break down when faced with complex, multi-domain goals (such as generating a full software project from scratch). A single agent requires access to numerous tools and a massive system prompt, which dilutes its focus and consumes excessive tokens. Multi-agent orchestration resolves this by distributing workloads across specialized, isolated agent nodes. Each agent operates with a narrow system prompt and a small toolset. However, without strict supervisor boundaries and delegation controls, multi-agent systems can easily fall into infinite conversational ping-pong loops, state conflicts, and runaway token bills.

---

## Core Concepts

### 1. Collaboration Topologies

Multi-agent interactions are governed by specific structural patterns:

- **Sequential Pipeline**: A chain structure where Agent A processes the input, writes its results to the state, and passes control to Agent B. Best for linear workflows (e.g., Content Writer -> Copy Editor -> Translator).
- **Hierarchical (Manager-Worker)**: A central Supervisor model. The Supervisor receives the high-level goal, breaks it down, invokes specialized worker nodes sequentially, evaluates their outputs, and aggregates the final result. Workers do not talk to each other; they report only to the Supervisor.
- **Blackboard / Shared State**: Workers inspect a shared datastore (the "blackboard") containing the current system state. When a worker detects a state condition matching its specialty, it executes, updates the blackboard, and yields control.
- **Chat Networks**: Autonomous agents engage in a multi-party group chat, exchanging messages directly. Highly expressive, but difficult to restrict and test.

```
                    HIERARCHICAL COORDINATION

                       [ High-Level Goal ]
                                │
                                ▼
                       ┌─────────────────┐
                       │   SUPERVISOR    │
                       └─┬─────────────┬─┘
                         │             │
              ┌──────────┴──┐       ┌──┴──────────┐
              ▼             ▲       ▼             ▲
        ┌───────────┐       │   ┌───────────┐     │
        │  WORKER A │       │   │  WORKER B │     │
        │  (Coder)  │───────┘   │ (Tester)  │─────┘
        └───────────┘           └───────────┘
```

### 2. State Syncing & Handoff Mechanisms

- **Explicit Transition Handoff**: An agent finishes its task and calls a function whose name designates the next recipient agent (e.g., `transfer_to_support_tier2`).
- **State Passing**: The system wraps agent execution in an orchestrator harness. When a node exits, the harness captures its output variables, merges them into the global database state, and determines the next node to activate using conditional router functions.
- **Context Budgeting**: Handoffs must be clean. Instead of passing an agent's entire chat history to the next node, the orchestrator passes only a structured state summary to keep context sizes compact.

---

## Real-World Production Learnings

We engineered a travel planning booking platform. We deployed three agents: a **Supervisor Agent** that coordinated scheduling, a **Flight Agent** that queried flight availability tools, and a **Hotel Agent** that reserved lodging.

**The Failure**:
A customer requested a booking for "Tokyo for 5 days in October." The Flight Agent found a flight for October 10th to 15th. The Hotel Agent evaluated hotels but found no available rooms for those exact dates. It requested the Flight Agent to look for other dates.

The Flight Agent shifted the schedule to October 12th to 17th. The Hotel Agent had rooms but they exceeded the user's budget. It requested the Flight Agent to search again.

This created a **multi-agent feedback loop**. The two agents repeatedly queried each other, shifting dates and hotel tiers back and forth. They exchanged over **450 messages in 12 minutes**, executing hundreds of search API calls and running up a **$900 token bill for a single customer query** before the database threw a memory exception.

**The Diagnostic**:

1. **Unbounded Peer-to-Peer Delegation**: The workers were allowed to coordinate directly and delegate tasks to each other without reporting back to the Supervisor node.
2. **No Cycle Constraints**: The orchestrator did not track state changes over time. It could not detect that the dates were looping.
3. **No Timeout/Threshold Counters**: The pipeline had no mechanism to detect a recursion stalemate.

**The Refactor**:
We refactored the orchestration topology to enforce a **Hierarchical Supervisor Pattern** with state history locking:

1. **Centralized Routing**: We banned peer-to-peer worker messaging. All worker outputs must be returned to the Supervisor class.
2. **Loop Iteration Counter**: We added a tracking register inside our central supervisor class to log how many times a particular task type was routed to a specific agent node.
3. **Autonomy Override**: If a task loops back to the same agent node more than 3 times, the orchestrator aborts execution and alerts the user to select alternative preferences.

Here is the TypeScript implementation of our hierarchical supervisor controller:

```typescript
// Hierarchical Multi-Agent Supervisor Controller
interface Agent {
  name: string;
  run(
    state: BookingState,
  ): Promise<{ nextTarget: string; stateUpdates: Partial<BookingState> }>;
}

interface BookingState {
  destination: string;
  startDate?: string;
  endDate?: string;
  hotelBooked: boolean;
  flightBooked: boolean;
  budgetLimit: number;
}

export class MultiAgentSupervisor {
  private workers: Map<string, Agent> = new Map();
  private maxTaskVisits = 3;

  // Track node executions to identify recursion loops
  private nodeVisitCounts: Map<string, number> = new Map();

  constructor(agentsList: Agent[]) {
    for (const agent of agentsList) {
      this.workers.set(agent.name, agent);
    }
  }

  public async runBookingOrchestrator(
    initialDestination: string,
    budget: number,
  ): Promise<BookingState> {
    const state: BookingState = {
      destination: initialDestination,
      hotelBooked: false,
      flightBooked: false,
      budgetLimit: budget,
    };

    let nextStep = 'FlightAgent';
    this.nodeVisitCounts.clear();

    while (nextStep !== 'COMPLETE') {
      console.log(`Supervisor routing control to: [${nextStep}]`);

      // 1. Check for infinite loops
      const visits = this.nodeVisitCounts.get(nextStep) || 0;
      if (visits >= this.maxTaskVisits) {
        throw new Error(
          `Orchestration halted: Loop detected. Agent [${nextStep}] reached the maximum execution threshold (${this.maxTaskVisits} visits).`,
        );
      }
      this.nodeVisitCounts.set(nextStep, visits + 1);

      // 2. Fetch worker agent
      const agent = this.workers.get(nextStep);
      if (!agent) {
        throw new Error(
          `Orchestration failure: Unknown target agent node "${nextStep}".`,
        );
      }

      // 3. Execute worker using isolated copy of state
      const outcome = await agent.run({ ...state });

      // 4. Merge state changes safely back to supervisor state
      Object.assign(state, outcome.stateUpdates);

      // 5. Enforce supervisor check: worker cannot route directly.
      // Supervisor evaluates if the proposed next node is valid or requires intervention.
      nextStep = this.evaluateNextStep(state, outcome.nextTarget);
    }

    return state;
  }

  private evaluateNextStep(
    state: BookingState,
    proposedTarget: string,
  ): string {
    // If flight and hotel are booked, we are complete
    if (state.flightBooked && state.hotelBooked) {
      return 'COMPLETE';
    }

    // Force strict routing rules: workers must return control back to supervisor
    // who then decides. Peer-to-peer routing is blocked.
    if (proposedTarget === 'FlightAgent' && state.flightBooked) {
      // Supervisor intervenes: If flight is already booked but flight agent is called again,
      // it means dates are shifting. We must check constraints.
      console.log(
        'Supervisor intervention: Flight dates are shifting due to hotel constraints.',
      );
    }

    return proposedTarget;
  }
}
```

By transitioning to a central supervisor with strict visit counters, we eliminated multi-agent feedback loops. If the Flight and Hotel agents cannot resolve dates within 3 iterations, the orchestrator halts execution and requests user clarification, preventing runaway token costs.

---

## Related Reading

- [Agent Architectures](./agent-architectures.md)
- [OpenClaw & Autonomous Agents](./openclaw-and-autonomous-agents.md)
- [Basics of API Design](../../backend/api-design/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.agentic-ai.multi-agent-orchestration.md)
