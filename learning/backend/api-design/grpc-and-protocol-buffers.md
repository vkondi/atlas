[⬅️ Back to Backend Engineering](../README.md)

# gRPC & Protocol Buffers

gRPC (gRPC Remote Procedure Calls) is a high-performance, open-source universal RPC framework developed by Google. It utilizes **Protocol Buffers** for serialization and **HTTP/2** for network transport.

---

## Why It Matters

In a microservices architecture, services must communicate constantly. Using standard REST over JSON for internal service-to-service communication introduces significant overhead:

1. **Serialization Cost**: JSON is text-based. Parsing and stringifying JSON strings consumes significant CPU cycles at scale.
2. **Connection Overhead**: HTTP/1.1 requires opening separate TCP connections or negotiating head-of-line blocking, delaying responses.
3. **Payload Bloat**: Repeating HTTP headers and bloated text strings wastes network bandwidth.

gRPC solves this by serializing data into compact binary payloads and multiplexing requests over a single persistent HTTP/2 connection.

---

## Protocol Buffers (Protobuf)

Protocol Buffers is a binary serialization format. Data structures are defined in a `.proto` contract file:

```protobuf
syntax = "proto3";

package catalog;

// Service definition
service ProductService {
  rpc GetProduct (ProductRequest) returns (ProductResponse);
}

// Request payload contract
message ProductRequest {
  string product_id = 1; // Field name with unique tag number
}

// Response payload contract
message ProductResponse {
  string product_id = 1;
  string name = 2;
  double price = 3;
}
```

### The Tag Number Design

In Protobuf, field names are _not_ serialized. Instead, the compiler uses the **field tag numbers** (e.g., `= 1`, `= 2`) to identify fields in the binary stream.

- **Backward Compatibility**: You can rename a field in the `.proto` schema without breaking compatibility, as long as you preserve the tag number.
- **Compression**: Tag numbers require only a few bits in the binary stream, making the serialized payload much smaller than JSON.

---

## gRPC over HTTP/2 Transport

gRPC runs exclusively over HTTP/2, unlocking advanced streaming and routing capabilities:

### 1. Multiplexing

HTTP/2 allows interleaving multiple requests and responses over a single TCP connection. This prevents head-of-line blocking, allowing microservices to run hundreds of concurrent operations without establishing new connections.

### 2. Streaming Types

gRPC supports four distinct API designs:

- **Unary**: Classic request-response. Client sends one request, server returns one response.
- **Server Streaming**: Client sends one request, and the server returns a stream of multiple responses (e.g., reading live database logs).
- **Client Streaming**: Client streams a sequence of payloads (e.g. uploading a large split file chunk-by-chunk), and the server returns a single response upon completion.
- **Bidirectional Streaming**: Both client and server stream sequences of messages simultaneously over a single persistent channel.

---

## Real-World Production Learnings

In an enterprise activity tracking system, microservices reported user behavior data (button clicks, page visits) to a central event aggregator database. We originally built this using standard REST POST endpoints sending JSON payloads. At peak loads (reaching 6,000 events/sec), our internal Kubernetes network saturated at 145MB/s, and our aggregator pods suffered from 85% CPU utilization due to constant JSON parsing loops.

We refactored the inter-service communication to use **gRPC client streaming**:

1. We compiled our `.proto` contract into Go and Node.js client packages.
2. Instead of firing a new HTTP request for every single user event, the microservices opened a persistent gRPC client stream and wrote events onto the channel asynchronously.

The binary serialization reduced our average request payload size by 82%. Because the TCP connection remained open, we bypassed the CPU cost of negotiating TLS handshakes and parsing JSON text. Internal network bandwidth consumption dropped from **145MB/s to 24MB/s**, and aggregator CPU usage fell to 18%, saving us thousands of dollars in monthly cloud compute scaling costs.

---

## Related Reading

- [API Design Fundamentals](./basics.md)
- [REST API Principles](./rest-api-principles.md)
- [GraphQL Fundamentals](./graphql-fundamentals.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.api-design.grpc-and-protocol-buffers.md)
