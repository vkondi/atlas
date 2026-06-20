[⬅️ Back to Frontend Engineering](../../README.md)

# Custom Hooks Patterns

Custom Hooks are the primary mechanism for abstracting stateful logic and side effects from components into modular, reusable, and testable functions. By convention, custom hooks are named with a `use` prefix (e.g., `useToggle`, `useAuth`) and can compose other standard React hooks internally.

---

## Why It Matters

As UI elements grow in complexity, component files easily become bloated with state setters, lifecycle effect loops, and event handlers. This tight coupling makes testing difficult and leads to duplicated logic across different views. Custom hooks decouple presentation markup (JSX) from business logic.

---

## Core Concepts

### 1. State Isolation (No Shared State)

A common misconception is that calling a custom hook shares state between different components:

- **Distinct Allocations**: Every time a component calls a custom hook, React appends the hook's internal state list to that specific component's Fiber node.
- **Independent Instances**: Two components calling `useFetchData()` will run separate network requests and maintain independent local state cache records.

### 2. Designing Composable Hook APIs

When returning values from custom hooks, choose the structure that best fits the usage pattern:

#### Pattern A: The Tuple Return (Resembling `useState`)

Ideal for hooks that manage a single state value where the consumer needs to rename the returned variables:

```typescript
function useToggle(initialValue: boolean = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle];
}

// Consumer naming flexibility
const [isSidebarOpen, toggleSidebar] = useToggle(true);
const [isModalOpen, toggleModal] = useToggle(false);
```

#### Pattern B: The Object Return

Preferred for hooks that return multiple states, options, or handlers, preventing long-positional tuple arrays and allowing clean destructuring:

```typescript
interface FormWizard {
  step: number;
  nextStep: () => void;
  prevStep: () => void;
  isLastStep: boolean;
}

function useFormWizard(totalSteps: number): FormWizard {
  const [step, setStep] = useState(1);
  const nextStep = useCallback(
    () => setStep((s) => Math.min(s + 1, totalSteps)),
    [totalSteps],
  );
  const prevStep = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  return {
    step,
    nextStep,
    prevStep,
    isLastStep: step === totalSteps,
  };
}
```

---

## Best Practices

- **Stabilize Returned Callbacks**: Always wrap functional handlers returned from custom hooks in `useCallback` to prevent downstream child components from executing unnecessary re-renders.
- **Keep Hooks Single-Responsibility**: Design custom hooks to manage single concerns (e.g., `useLocalStorage` for storage, `useMedia` for screen sizes) and compose them at the component level.

---

## Real-World Production Learnings

In a multi-step user onboarding wizard, the main layout component grew to over 450 lines. The file mixed navigation rendering with step-validation logic, cache loading, and analytics reporting triggers. Testing this required spinning up a full UI testing environment. We refactored the logic into a custom `useOnboardingFlow` hook. The wizard component layout shrank to 70 lines of clean JSX, and we were able to validate the step states and loading flows using lightweight hooks unit tests (`@testing-library/react-hooks`) in milliseconds without mounting browser pages.

---

## Related Reading

- [React Hooks Mechanics](./basics.md)
- [Standard React Hooks](./standard-hooks.md)
- [UI Component Testing](../../../testing/integration-testing/component-testing.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/hooks.custom-hooks-patterns.md)
