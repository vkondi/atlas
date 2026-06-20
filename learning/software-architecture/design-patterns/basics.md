[⬅️ Back to Software Architecture](../README.md)

# Design Pattern Fundamentals

An analysis of SOLID object-oriented design principles and the Gang of Four (GoF) design pattern classifications.

---

## Why It Matters

Design patterns are standardized, reusable templates for solving common programming challenges. Rather than inventing ad-hoc code structures, design patterns provide engineers with a shared vocabulary and proven blueprints to optimize object relationships, decouple classes, and manage state transitions. However, design patterns are not silver bullets. Misapplying patterns or over-engineering code—such as wrapping basic constructors in complex abstract factories—results in code bloat and high reading complexity. Design patterns must be applied to satisfy the underlying **SOLID** principles of clean software engineering.

---

## Core Concepts

### 1. The SOLID Design Principles

SOLID is an acronym representing five core principles of object-oriented design and programming:

- **Single Responsibility Principle (SRP)**: A class should have only one reason to change. It should encapsulate one specific task or area of business rules.
- **Open/Closed Principle (OCP)**: Software components should be open for extension but closed for modification. You should be able to add new behaviors by writing new classes, not by modifying existing logic.
- **Liskov Substitution Principle (LSP)**: Subtypes must be completely substitutable for their base types. A derived class must extend the base class's behavior without breaking its client contracts.
- **Interface Segregation Principle (ISP)**: Clients should not be forced to depend on interfaces they do not use. Prefer small, focused interfaces over large, general-purpose ones.
- **Dependency Inversion Principle (DIP)**: High-level modules should not depend on low-level modules; both should depend on abstractions (interfaces).

### 2. GoF (Gang of Four) Pattern Classifications

The 23 classic GoF design patterns are divided into three primary categories:

#### Creational Patterns

Focus on object instantiation mechanisms, abstracting how objects are created, composed, and represented:

- **Singleton**: Guarantees a class has only one global instance.
- **Factory Method**: Defines an interface for creating an object, letting subclasses decide which class to instantiate.
- **Builder**: Separates the construction of a complex object from its representation, enabling step-by-step assembly.

#### Structural Patterns

Focus on how classes and objects are composed to form larger, flexible structures:

- **Adapter**: Translates the interface of a class into another interface clients expect, enabling incompatible classes to work together.
- **Decorator**: Dynamically adds responsibilities to an object at runtime without modifying its base class.
- **Facade**: Provides a simplified interface to a complex set of classes in a subsystem.

#### Behavioral Patterns

Focus on algorithms, communication channels, and responsibility assignment between objects:

- **Strategy**: Defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime.
- **Observer**: Defines a one-to-many dependency so that when one object changes state, all its dependents are notified automatically.
- **Command**: Encapsulates a request as an object, allowing parameterizing clients with different queues, logs, and rollback commands.

---

## Real-World Production Learnings

In our user data processing pipeline, we had a `UserDataImporter` class that performed multiple tasks: downloading file sources via SFTP, parsing CSV strings, validating database fields, generating output PDFs, and sending email summaries.

This class violated the **Single Responsibility Principle (SRP)**. Whenever the shipping team requested changing the email template, or the security team required encrypting the SFTP download, we had to edit this single 1,800-line class. The file was difficult to write tests for, and modifications frequently broke unrelated parsing logic.

**The Refactor**:
We decomposed the class using SOLID principles and GoF behavioral patterns:

1. We defined a `SourceDownloader` interface to isolate file transfers (DIP).
2. We extracted the parsing logic into the **Strategy Pattern** behind a `FileParser` interface, allowing us to swap between CSV and JSON strategies without changing the importer loop (OCP).
3. We extracted the email and slack dispatching logic behind a small `NotificationSender` interface (ISP).

```javascript
// Decoupled importer following SRP
class UserDataImporter {
  constructor(downloader, parser, database, notifier) {
    this.downloader = downloader;
    this.parser = parser;
    this.database = database;
    this.notifier = notifier;
  }

  async importData(filePath) {
    const rawData = await this.downloader.download(filePath);
    const parsedRecords = await this.parser.parse(rawData);
    await this.database.saveBatch(parsedRecords);
    await this.notifier.sendSuccessSummary(parsedRecords.length);
  }
}
```

After refactoring, our core importer class shrank from 1,800 lines of complex nested blocks to less than 20 lines of clean execution steps. Testing the parser strategy or writing a mock downloader took minutes because we could inject mocks into the class constructor in our unit tests, preventing regressions.

---

## Related Reading

- [Adapter Pattern](./adapter-pattern.md)
- [Factory Pattern](./factory-pattern.md)
- [Repository Pattern](./repository-pattern.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.design-patterns.basics.md)
