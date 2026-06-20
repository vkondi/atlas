[⬅️ Back to DevOps & Cloud](../README.md)

# Serverless Computing

An operational guide to Function-as-a-Service (FaaS) runtime mechanics, cold start optimization, event-driven integrations (API Gateway, S3 triggers), and VPC network interface tuning.

---

## Why It Matters

Serverless computing (FaaS) allows engineers to deploy code without managing permanent virtual machine resources. The cloud provider handles OS maintenance, runtime provisioning, and elastic scaling, billing only for actual execution time in milliseconds. However, serverless architectures introduce unique engineering challenges: **Cold Start Latency** can delay user requests by seconds during traffic spikes, stateless lifecycles prevent local cache sharing, and sudden concurrency surges can easily overwhelm downstream database connections. Building serverless architectures requires optimizing code package sizes, managing runtime initialization loops, and structuring network interfaces.

---

## Core Concepts

### 1. FaaS Execution Lifecycle & Event Triggers

A serverless function (like AWS Lambda) remains idle until an event source triggers execution:

- **Event Sources**: Lambda is triggered by diverse inputs:
  - `Synchronous`: API Gateway routing HTTP requests. The client blocks waiting for the response.
  - `Asynchronous`: S3 file uploads, SNS topics. Lambda executes in the background; the source receives an immediate `202 Accepted` confirmation.
  - `Polling`: SQS queues, Kinesis streams. An AWS polling agent reads the queue and passes records to Lambda.
- **Billing Parameters**: Cost is calculated as a product of:
  `Cost = Allocations Memory (GB) * Execution Duration (ms) * Requests Count`
  _Rule of thumb_: Allocating more memory also allocates proportional CPU power, often speeding up execution and reducing total costs for compute-heavy tasks.

### 2. The Cold Start Dilemma

When a function is triggered after being idle, or during a scale-out event, it experiences a **Cold Start**:

```
                       SERVERLESS COLD START LATENCY

   [ Trigger Event ]
          │
          ▼
   ┌──────────────┐
   │ Provision VM │ (AWS allocates hypervisor container slot)
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Download Code│ (Downloads code package from S3 - Bundle Size Dependent)
   └──────┬───────┘
          ▼
   ┌──────────────┐  Time-To-First-Execution (Cold Start)
   │ Start Runtime│ (Init JVM, V8, Python process)
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Execute Code │ (Runs global variables init, then handler function)
   └──────────────┘
```

- **Warm Start**: If a function is triggered repeatedly within 5–15 minutes, the container is reused, executing the handler immediately (latency <5ms).
- **Mitigation Strategies**:
  - _Runtime Choice_: Compiled languages (Java, C#) require JVM/CLR startup overhead, leading to multi-second cold starts. Interpreted runtimes (Node.js, Python, Go) boot in under 50ms.
  - _Bundle Optimization_: Minimizing package sizes through tree-shaking, bundling, and avoiding heavy local binaries (like headless Chrome).
  - _Provisioned Concurrency_: A paid feature where AWS keeps a designated number of containers permanently warm and initialized, eliminating cold starts entirely for that baseline.

### 3. Serverless Networking inside a VPC

Running Lambdas inside a Virtual Private Cloud (VPC) to access secure private RDS databases introduces a major latency challenge. Historically, on a cold start, the Lambda service had to provision and attach an **Elastic Network Interface (ENI)** to the container. This network routing attachment took 8 to 15 seconds, making synchronous API runs unusable. Modern AWS networking (via AWS Hyperplane) pre-allocates ENIs, reducing network connection attachment times to under 100ms.

---

## Real-World Production Learnings

We developed an automated PDF generation microservice on AWS Lambda, triggered by an API Gateway endpoint. The service loaded HTML templates and ran a headless browser to render documents.

**The Failure**:
When users generated invoice reports, the system worked cleanly during active hours. However, the first user requesting a report in the morning suffered a **504 Gateway Timeout error** (exceeding API Gateway's strict 30-second execution ceiling).

Our logs showed that the Lambda execution completed successfully but took over **34 seconds to resolve** during the initial cold start.

**The Diagnostic**:

1. **Bloated Code Package**: Our zip deployment bundle was 82 MB. It packed a full local Puppeteer and headless Chrome binary, forcing AWS to download a massive package on cold starts.
2. **Global Variable Re-initialization**: The database connection client and Puppeteer launch functions were written _inside_ the main handler function block. They were executed on every invocation, bypassing the benefits of container reuse.
3. **VPC Network Overhead**: The function was attached to our private VPC to query the RDS instance, triggering legacy ENI allocation delays.

**The Refactor**:
We re-architected our serverless code structure:

1. **Separate Chrome Layer**: We removed the raw Puppeteer binary from our zip package, replacing it with a compressed AWS Lambda Layer (`@sparticuz/chromium`) configured specifically for serverless VRAM runtimes. Our deployment zip package shranked from 82 MB to **2.4 MB**.
2. **Bootstrap Optimization**: We moved the database connection pool instantiation and Chrome launching logic _outside_ the handler function, caching the connection variables globally for warm starts.
3. **Hyperplane ENI Re-mapping**: We updated our subnet configurations to leverage AWS Hyperplane pre-allocated endpoints.

Here is our optimized Node.js Lambda handler script:

```javascript
// Optimized PDF Generation Lambda Handler
// Targets: Warm-start variable caching and lightweight dependencies

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { Pool } = require('pg');

// 1. Instantiate DB pool OUTSIDE the handler (reused across warm starts)
const dbPool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  max: 1, // Keep pool small for serverless: 1 connection per concurrent container
  idleTimeoutMillis: 15000,
});

let cachedBrowser = null;

// Helper to launch or return cached browser instance
async function getBrowser() {
  if (
    cachedBrowser &&
    cachedBrowser.process() &&
    cachedBrowser.process().signalCode === null
  ) {
    return cachedBrowser;
  }

  cachedBrowser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  return cachedBrowser;
}

exports.handler = async (event) => {
  console.log('API Request received.');

  const userId = event.queryStringParameters.userId;
  let dbClient;

  try {
    // 2. Reuse cached DB pool connection (resolves instantly on warm start)
    dbClient = await dbPool.connect();
    const dbResult = await dbClient.query(
      'SELECT name, amount FROM invoices WHERE user_id = $1',
      [userId],
    );
    const userData = dbResult.rows[0];

    // 3. Reuse cached browser instance
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setContent(
      `<h1>Invoice for ${userData.name}</h1><p>Amount: $${userData.amount}</p>`,
    );
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await page.close();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/pdf' },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    if (dbClient) dbClient.release();
  }
};
```

By caching the database pool and browser objects in global memory, and shrinking the deployment bundle size down to 2.4 MB, we eliminated cold start delays. Cold start times plummeted from 34 seconds to **1.1 seconds**, safely under the API Gateway timeout limit, while subsequent warm starts resolved in less than **45ms**.

---

## Related Reading

- [Cloud Computing Basics](./basics.md)
- [AWS Core Services](./aws-core-services.md)
- [Next.js App Router Server Actions](../../frontend/meta-frameworks/nextjs/server-components-vs-client-components.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.cloud-providers.serverless-computing.md)
