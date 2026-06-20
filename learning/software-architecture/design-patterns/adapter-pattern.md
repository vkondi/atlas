[⬅️ Back to Software Architecture](../README.md)

# Adapter Pattern

A detailed analysis of the Adapter structural pattern, wrapping incompatible third-party APIs, standardizing library interfaces, and improving unit test mockability.

---

## Why It Matters

Software applications rely heavily on external SaaS providers and third-party libraries (e.g., payment gateways, SMS dispatchers, logging utilities). Importing these external libraries directly into core application services creates tight coupling. If the vendor deprecates their library, changes their API method names, or if you swap to a different provider, you must trace and rewrite code across the entire repository. The **Adapter Pattern** decouples these external dependencies by wrapping them behind a consistent, application-owned interface, shielding the core system from external vendor changes.

---

## Core Concepts

The Adapter Pattern is composed of three primary structural roles:

```
                  ADAPTER COMPOSITION TOPOLOGY

   +------------------+                   +--------------------+
   |   Application    |                   |    Third-Party     |
   |      Core        |                   |    SaaS Client     |
   | (Expects Target) |                   |     (Adaptee)      |
   +------------------+                   +--------------------+
            ||                                      ^
            v (Calls Port)                          | (Translates & Maps)
   +------------------+   implements   +--------------------+
   |   SmsProvider    |<===============|   TwilioAdapter    |
   |     (Target)     |                |     (Adapter)      |
   +------------------+                +--------------------+
```

- **Target (Port)**: The domain-specific interface that your application expects and controls (e.g., `SmsProvider` interface).
- **Adaptee**: The incompatible third-party class or library interface that you want to integrate (e.g., Twilio's raw client helper).
- **Adapter**: A wrapper class that implements the Target interface, instantiates the Adaptee, and translates requests and response types between them.

### Code Implementation Example

```typescript
// 1. Target: The standard interface owned by the application core
interface SmsProvider {
  sendSms(phoneNumber: string, message: string): Promise<boolean>;
}

// 2. Adaptee: The third-party client with an incompatible signature
class LegacyTwilioClient {
  dispatchMessage(payload: { phone: string; body_text: string }): {
    success_code: number;
  } {
    // Raw SDK details
    return { success_code: 200 };
  }
}

// 3. Adapter: Implements target interface, wrapping the adaptee
class TwilioSmsAdapter implements SmsProvider {
  constructor(private twilioClient: LegacyTwilioClient) {}

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    // Translate standard parameters to what the SDK expects
    const response = this.twilioClient.dispatchMessage({
      phone: phoneNumber,
      body_text: message,
    });

    // Translate the SDK response to our standard return contract
    return response.success_code === 200;
  }
}
```

### Improving Test Mockability

By decoupling the application core from the raw SDK client, unit tests can easily mock the adapter:

- In tests, instead of passing the real `TwilioSmsAdapter` (which would trigger real network costs and calls), you inject a `MockSmsAdapter` that implements the `SmsProvider` interface.
- This allows testing registration logic in isolation under a fraction of a millisecond.

---

## Real-World Production Learnings

In our multi-factor authentication (MFA) service, we originally integrated **Twilio** directly to send SMS authentication tokens to users. We imported the Twilio SDK and made direct calls in 15 different handlers:

```javascript
// Legacy tightly coupled Twilio code
const twilio = require('twilio')(sid, token);
await twilio.messages.create({
  body: token,
  to: userPhone,
  from: twilioNumber,
});
```

During a major regional Twilio fiber outage, our users could not receive MFA codes, blocking log-ins for hours. The business decided to add **MessageBird** as a secondary fallback. However, because our code was coupled directly to Twilio across 15 handlers, integrating MessageBird required updating every file to handle MessageBird's proprietary method parameters.

**The Refactor**:
We decoupled our SMS code using the Adapter Pattern:

1. We created a standard `SmsSender` interface in our core business logic.
2. We wrote a `TwilioSmsAdapter` and a `MessageBirdSmsAdapter` implementing the `SmsSender` interface.
3. We refactored all 15 handlers to only depend on the `SmsSender` interface.
4. We wrote a **Composite Fallback Manager** to route calls:

```javascript
class FallbackSmsSender {
  constructor(private primary: SmsSender, private secondary: SmsSender) {}

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      return await this.primary.sendSms(phoneNumber, message);
    } catch (err) {
      console.error("Primary SMS gateway failed. Routing to secondary...", err);
      // Seamlessly fall back to secondary adapter if primary fails
      return await this.secondary.sendSms(phoneNumber, message);
    }
  }
}
```

By decoupling our services via adapters, we implemented SMS failover in our application. When Twilio experienced another latency spike, our system automatically diverted writes through MessageBird, keeping our MFA logins active with zero downtime.

---

## Related Reading

- [Design Pattern Basics](./basics.md)
- [Factory Pattern](./factory-pattern.md)
- [Clean Architecture Principles](../architectural-patterns/clean-architecture-principles.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.design-patterns.adapter-pattern.md)
