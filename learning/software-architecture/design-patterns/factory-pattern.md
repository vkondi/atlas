[⬅️ Back to Software Architecture](../README.md)

# Factory Pattern

A detailed analysis of Factory Method, Abstract Factory, and Simple Factory patterns, decoupling class instantiations from business logic, and standardizing object compositions.

---

## Why It Matters

Using the `new` operator directly inside business services couples codebases to specific concrete implementations and constructor signatures. If a class gains a new dependency (e.g., adding a logger to a payment service), you must find and update every `new Service(...)` instantiation across the entire repository. Factory patterns resolve this by encapsulating object creation procedures in dedicated modules. This enables returning polymorphic subtypes sharing an interface, hides configuration parameters (like API keys), and facilitates unit test mocking.

---

## Core Concepts

Creational factories are organized into three primary architectural tiers:

### 1. The Simple Factory (Parameter-Driven)

A Simple Factory is a utility class or static method that encapsulates object creation logic, returning one of several possible subclass instances based on an input argument:

```typescript
interface PaymentGateway {
  process(amount: number): Promise<boolean>;
}

class StripeGateway implements PaymentGateway {
  /* ... */
}
class PayPalGateway implements PaymentGateway {
  /* ... */
}

class PaymentGatewayFactory {
  constructor(
    private stripeKey: string,
    private paypalToken: string,
  ) {}

  create(method: 'stripe' | 'paypal'): PaymentGateway {
    switch (method) {
      case 'stripe':
        return new StripeGateway(this.stripeKey);
      case 'paypal':
        return new PayPalGateway(this.paypalToken);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }
}
```

### 2. Factory Method (Delegrated Subclassing)

The **Factory Method Pattern** defines an interface for creating an object, but defers the actual instantiation decision to subclasses:

```
                  FACTORY METHOD PATTERN

      [ DocumentCreator ] -------------> [ Document (Interface) ]
      - createDocument() (Abstract)                 ^
               ^                                    |
               | (Overrides)                        | (Returns)
      [ PdfDocumentCreator ] -----------------------+
      - createDocument() (Returns PdfDocument)
```

- **Use case**: When a framework needs to manage a workflow of objects, but doesn't know what concrete implementations the client application will use. The base creator calls its own abstract factory method to obtain the object.

### 3. Abstract Factory (Families of Products)

The **Abstract Factory Pattern** provides an interface for creating families of related or dependent objects without specifying their concrete classes:

- **Use case**: Implementing multi-platform UI widget toolkits. A `WidgetFactory` interface defines methods like `createButton()` and `createCheckbox()`.
  - The `WindowsWidgetFactory` creates `WindowsButton` and `WindowsCheckbox`.
  - The `MacWidgetFactory` creates `MacButton` and `MacCheckbox`.
  - The client code interacts exclusively with the abstract interfaces, ensuring UI elements match the active platform consistently.

---

## Real-World Production Learnings

In our multi-tenant notification engine, we sent alerts to users via email (SendGrid), SMS (Twilio), or push alerts (Firebase Cloud Messaging).

Originally, our notification use cases manually checked preferences and initialized the client SDKs inline:

```javascript
// Legacy use case with inline instantiation
async function sendNotification(userId, message) {
  const user = await userRepo.findById(userId);
  if (user.alertPref === 'email') {
    const sender = new SendGridSender(process.env.SENDGRID_API_KEY);
    await sender.sendEmail(user.email, message);
  } else if (user.alertPref === 'sms') {
    const sender = new TwilioSender(
      process.env.TWILIO_SID,
      process.env.TWILIO_TOKEN,
    );
    await sender.sendSms(user.phone, message);
  }
}
```

This caused multiple issues:

1. Whenever the SMS provider changed their credentials format, or we added Slack alerts, we had to modify every use case that sent notifications.
1. The use case code was cluttered with system configurations and API credentials.
1. Unit testing was difficult because we could not run use case checks without loading environment variables.

**The Refactor**:
We decoupled the use case by implementing a **Simple Factory**:

1. We defined a unified `NotificationSender` interface.
1. We created a `NotificationSenderFactory` class, which we registered as a singleton in our Dependency Injection container, injecting the credentials at boot:

```javascript
class NotificationSenderFactory {
  constructor(sendgridKey, twilioSid, twilioToken) {
    this.sendgridKey = sendgridKey;
    this.twilioSid = twilioSid;
    this.twilioToken = twilioToken;
  }

  createSender(channelType) {
    switch (channelType) {
      case 'email':
        return new SendGridAdapter(this.sendgridKey);
      case 'sms':
        return new TwilioAdapter(this.twilioSid, this.twilioToken);
      default:
        throw new Error(`Unsupported alert channel: ${channelType}`);
    }
  }
}
```

1. We refactored our use case to depend only on the factory and the unified interface:

```javascript
class AlertService {
  constructor(userRepo, senderFactory) {
    this.userRepo = userRepo;
    this.senderFactory = senderFactory;
  }

  async sendAlert(userId, messageText) {
    const user = await this.userRepo.findById(userId);
    // Polymorphic creation of sender adapter
    const sender = this.senderFactory.createSender(user.alertPref);

    // Core use case remains clean of credentials and SDK particulars
    await sender.send(user.destination, messageText);
  }
}
```

This creational encapsulation simplified our codebase. When we added Slack integrations, we simply wrote a `SlackAdapter` and added its mapping to the factory class, without modifying any business rules or test blocks in our core `AlertService`.

---

## Related Reading

- [Design Pattern Basics](./basics.md)
- [Adapter Pattern](./adapter-pattern.md)
- [Repository Pattern](./repository-pattern.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.design-patterns.factory-pattern.md)
