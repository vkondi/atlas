[⬅️ Back to Frontend Engineering](../README.md)

# Prototypal Inheritance

Prototypal inheritance is the native delegation mechanism JavaScript uses to share properties and methods between objects. Unlike classical class-based languages (such as Java or C++), where classes act as blueprints that copy structures during instantiation, JavaScript objects inherit behavior by linking directly to prototype objects in memory.

---

## Why It Matters

Understanding prototypes is key to writing high-performance, memory-efficient JavaScript. Inefficient class patterns can lead to massive memory bloat by duplicating method instances across thousands of objects. Proper prototype design ensures that shared methods reside in a single memory location.

---

## Core Concepts

### 1. Prototype Linkages: `__proto__` vs. `prototype`

Every object in JavaScript holds an internal link pointing to another object, known as its prototype:

- **`[[Prototype]]` (or `__proto__`)**: The internal pointer reference on an _object instance_ pointing to the prototype object from which it delegates actions. Use standard API `Object.getPrototypeOf(obj)` to read this reference.
- **`ConstructorFunction.prototype`**: The property defined on _constructor functions_ (or classes) that serves as the blueprint template. When you instantiate an object using the `new` keyword, the engine automatically assigns this object as the new instance's `__proto__` link.

### 2. The Prototype Chain

When you query a property on an object (e.g., `user.sayHello()`), the JavaScript engine executes a sequential lookup:

1. It checks the object's **own properties** (instance-level properties).
2. If not found, it traverses the internal `[[Prototype]]` pointer to the parent prototype object.
3. It recursively climbs the chain until it either finds the property or reaches the end of the chain (`Object.prototype.__proto__ === null`), where it returns `undefined`.

```
  +------------------+
  |   myInstance     |
  |  name: "Asset"   |
  |  __proto__ ------+-----> +---------------------+
  +------------------+       |  Asset.prototype    |
                             |  render() { ... }   |
                             |  __proto__ ---------+-----> +-----------------------+
                             +---------------------+       |   Object.prototype    |
                                                           |   toString() { ... }  |
                                                           |   __proto__: null     |
                                                           +-----------------------+
```

### 3. Property Shadowing

If you write a property to an instance that shares a name with a prototype method, the property is written directly to the instance. This "shadows" (blocks access to) the prototype property without modifying the prototype object itself:

```javascript
const parent = { greet: () => 'Hello!' };
const child = Object.create(parent);

console.log(child.greet()); // "Hello!"
child.greet = () => 'Hi!'; // Shadowing
console.log(child.greet()); // "Hi!"
console.log(parent.greet()); // "Hello!" (Parent remains unchanged)
```

### 4. ES6 Classes (Syntactic Sugar)

The ES6 `class` syntax is a wrapper over prototypes:

```javascript
// ES6 Class
class Device {
  constructor(id) {
    this.id = id;
  }
  turnOn() {
    return 'On';
  }
}

// Behind the scenes (compiled to):
function Device(id) {
  this.id = id;
}
Device.prototype.turnOn = function () {
  return 'On';
};
```

---

## Memory Optimization: Constructors vs. Prototypes

A common architectural mistake is declaring methods inside constructors instead of on the prototype:

```javascript
// Anti-Pattern: Duplicates function object in memory for EVERY instance
function User(name) {
  this.name = name;
  this.speak = () => console.log(this.name);
}

// Best Practice: Shares a single speak function reference across all instances
function User(name) {
  this.name = name;
}
User.prototype.speak = function () {
  console.log(this.name);
};
```

If you instantiate 10,000 users using the anti-pattern, the heap contains 10,000 duplicate function objects. Using prototype declarations stores the method exactly once in memory.

---

## Real-World Production Learnings

In an interactive chart rendering library displaying over 15,000 coordinate markers, the browser froze due to heap exhaustion. Memory profiling revealed that each marker instance was constructed using a class pattern where all event handlers were assigned inside the constructor context. This allocated thousands of individual closures in memory. Refactoring the markers to use standard prototype class methods reduced the instance footprint from 350MB down to 42MB, completely resolving the browser lag.

---

## Related Reading

- [JavaScript Basics](./basics.md)
- [Advanced Types (TypeScript)](../typescript/basics.md)
- [Unit Testing Mocking Strategies](../../testing/unit-testing/mocking-strategies.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.javascript.prototypes.md)
