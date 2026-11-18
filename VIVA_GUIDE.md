# 🛡️ PrivacyGuard — Viva Master Cheatsheet & Evaluation Guide
**Candidate:** Prabhas Raju (`PRABHASRAJU14`)  
**Project:** PrivacyGuard — Purpose-Aware Personal Data Leak Prevention Platform  
**Target Score:** 100% across all 17 Concepts

---

## 📑 Summary of All 17 Tested Viva Concepts

| # | Rubric Concept | Domain | File Location in Project | Status |
|---|---|---|---|:---:|
| 1 | **Prompt Engineering** | AI App Eng | `backend/services/ai_copilot.py` | ✅ Verified |
| 2 | **HTTP Status Codes Used Correctly** | Backend & System Design | `server.js` | ✅ Verified |
| 3 | **Middleware** | Backend & System Design | `server.js` | ✅ Verified |
| 4 | **RESTful Endpoint Design** | Backend & System Design | `server.js` (`/api/v1/scans`) | ✅ Verified |
| 5 | **Environment Variables & Secrets Management** | Engineering Practices | `.env`, `.env.example`, `.gitignore` | ✅ Verified |
| 6 | **Git Workflow** | Engineering Practices | Git conventional commits, `.gitignore` | ✅ Verified |
| 7 | **Client-Side Routing** | Frontend | `Privacy Guard/html/react_app.html` | ✅ Verified |
| 8 | **JavaScript — async/await** | Frontend / JS | `backend/services/js_concepts.js`, `server.js` | ✅ Verified |
| 9 | **JavaScript — Closures** | Frontend / JS | `backend/services/js_concepts.js` (`createRateLimiter`) | ✅ Verified |
| 10 | **JavaScript — Event Loop** | Frontend / JS | `backend/services/js_concepts.js` (`runEventLoopDemonstration`) | ✅ Verified |
| 11 | **JavaScript — Hoisting** | Frontend / JS | `backend/services/js_concepts.js` (`testHoistingBehaviors`) | ✅ Verified |
| 12 | **JavaScript — Promises vs Callbacks** | Frontend / JS | `backend/services/js_concepts.js` (`promisify`) | ✅ Verified |
| 13 | **React Component Composition** | Frontend (React) | `Privacy Guard/html/react_app.html` (`Card`, `CardHeader`) | ✅ Verified |
| 14 | **Side Effects with useEffect** | Frontend (React) | `Privacy Guard/html/react_app.html` (`useEffect` listeners) | ✅ Verified |
| 15 | **State Management with useState** | Frontend (React) | `Privacy Guard/html/react_app.html` (`useState`) | ✅ Verified |
| 16 | **CRUD Operations (Mongo)** | NoSQL (Mongo) | `backend/database/mongo_crud.py`, `mongo_service.js` | ✅ Verified |
| 17 | **SQL JOINs** | SQL (Postgres / Relational) | `backend/database/sql_joins.py`, `sql_schema.sql` | ✅ Verified |

---

## 🎯 Concept-by-Concept Detailed Guide & Viva Answers

### 1. Prompt Engineering (0.2 pts • AI App Eng)
- **Where in code:** `backend/services/ai_copilot.py` and `server.js` (`/api/ai/copilot`)
- **What it does:**
  1. **Structured System Prompt:** Defines persona as GDPR & DPDP AI Compliance Officer.
  2. **Role Delimitation:** Separates trusted instructions from untrusted data using `<untrusted_entities>` tags.
  3. **Prompt Injection Defense:** Neutralizes patterns like `"ignore previous instructions"` or `"you are now in godmode"`.
  4. **Structured JSON Output:** Uses Pydantic v2 `AIPurposeEvaluation` to force strict schema adherence.
- **Examiner Question:** *"How did you design your prompts to prevent hallucinations and injection attacks?"*
- **Your Viva Answer:**
  > *"I structured our AI Copilot prompt with three security layers: First, role delimitation using XML delimiters `<untrusted_entities>` so the LLM clearly separates instructions from user input. Second, an input sanitization function that catches jailbreak patterns like 'ignore previous instructions'. Third, strict Pydantic structured output (`AIPurposeEvaluation`) with `extra='forbid'`, ensuring the model can only return valid JSON matching our purpose minimization matrix without free-form hallucination."*

---

### 2. HTTP Status Codes Used Correctly (0.2 pts • Backend & System Design)
- **Where in code:** `server.js` (lines 350–430)
- **Codes used:**
  - `200 OK`: Standard successful responses (`GET /api/v1/scans`, `GET /api/health`).
  - `201 Created`: When a new scan resource is created (`POST /api/v1/scans`), accompanied by a `Location` header pointing to `/api/v1/scans/:id`.
  - `204 No Content`: Successful deletion (`DELETE /api/v1/scans/:id`) and pre-flight CORS (`OPTIONS`).
  - `400 Bad Request`: Malformed request payloads.
  - `404 Not Found`: Resource ID not found in store.
  - `422 Unprocessable Entity`: Semantic validation failure (e.g. missing `text` field).
  - `500 Internal Server Error`: Uncaught exceptions handled uniformly by `errorHandlerMiddleware`.
- **Examiner Question:** *"What HTTP status code do you return when creating a scan, and what header should accompany it?"*
- **Your Viva Answer:**
  > *"When creating a new scan via `POST /api/v1/scans`, we return `201 Created` along with a `Location: /api/v1/scans/{id}` header pointing to the newly generated resource URI. If the request body has invalid syntax we return `400 Bad Request`, and if required fields are missing we return `422 Unprocessable Entity`."*

---

### 3. Middleware (0.2 pts • Backend & System Design)
- **Where in code:** `server.js` (`applyMiddlewares`, `securityHeadersMiddleware`, `timingMiddleware`, `loggerMiddleware`, `rateLimitMiddleware`)
- **What it does:**
  - Composable request processing pipeline where each middleware receives `(req, res, next)` and can inspect, modify, or terminate the cycle before calling `next()`.
  - Sets security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`), computes response time header (`X-Response-Time`), logs safely, and enforces rate limits.
- **Examiner Question:** *"How does your middleware pipeline work?"*
- **Your Viva Answer:**
  > *"In `server.js`, we implemented an Onion / Express-style middleware runner `applyMiddlewares(req, res, next)`. The request passes sequentially through: 1) `securityHeadersMiddleware` which prevents clickjacking and MIME-sniffing, 2) `timingMiddleware` which attaches execution latency via `X-Response-Time`, 3) `loggerMiddleware` for structured access logging, and 4) `rateLimitMiddleware` to thwart brute-force denial-of-service."*

---

### 4. RESTful Endpoint Design (0.2 pts • Backend & System Design)
- **Where in code:** `server.js`
  - `GET /api/v1/scans` (List resources)
  - `POST /api/v1/scans` (Create resource)
  - `GET /api/v1/scans/:id` (Retrieve single resource)
  - `PUT /api/v1/scans/:id` (Update resource)
  - `DELETE /api/v1/scans/:id` (Delete resource)
- **Examiner Question:** *"What makes your API RESTful?"*
- **Your Viva Answer:**
  > *"Our API adheres to REST principles by using plural nouns (`/api/v1/scans`) for resource identification rather than actions in URLs, standard HTTP methods (GET, POST, PUT, DELETE) representing CRUD actions, statelessness between client and server, and appropriate HTTP status codes (200, 201, 204, 404)."*

---

### 5. Environment Variables & Secrets Management (0.2 pts • Engineering Practices)
- **Where in code:** `.env`, `.env.example`, `.gitignore`, `server.js` (`loadEnv`, `maskSecret`)
- **Key security practices:**
  - `.env` holds credentials (`APP_SECRET_KEY`, `MONGO_URI`, `DATABASE_URL`).
  - `.gitignore` strictly excludes `.env` and `*.env` to guarantee zero secrets reach GitHub.
  - `.env.example` provides a sanitized, unpopulated template for other developers.
  - In `server.js`, `maskSecret()` ensures keys printed to logs display as `dev...345` to avoid log-based credential leaks.
- **Examiner Question:** *"How do you handle sensitive credentials in this project?"*
- **Your Viva Answer:**
  > *"We store sensitive configuration like database connection strings and cryptographic keys in a `.env` file, loaded via environment variables. We provide `.env.example` with dummy values for onboarding and explicitly list `.env` inside `.gitignore` to prevent committing secrets to version control. Furthermore, our logging utility masks secrets so they never appear in plaintext console logs."*

---

### 6. Git Workflow (0.3 pts • Engineering Practices)
- **Where in repo:** Active GitHub repository `PRABHASRAJU14/Privacy-Guard.git`, Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).
- **Your Viva Answer:**
  > *"We follow the GitHub feature-branch and Conventional Commits standard. Every commit clearly specifies its type and scope, such as `feat: add AI Copilot prompt engineering` or `fix(extension): resolve syntax error in background.js service worker`. Our `.gitignore` cleanly separates source assets from generated build artifacts, virtual environments (`.venv/`), and database files."*

---

### 7. Client-Side Routing (0.2 pts • Frontend)
- **Where in code:** `Privacy Guard/html/react_app.html` (`window.location.hash`, `hashchange`)
- **How it works:**
  - Uses URL hash routing (`#/scan`, `#/purpose`, `#/protect`, `#/analytics`).
  - Listens to `window.addEventListener('hashchange', ...)` to transition between views instantaneously without triggering a full page reload or contacting the server for HTML rendering.
- **Examiner Question:** *"Explain how client-side routing works in your React application."*
- **Your Viva Answer:**
  > *"In `react_app.html`, we built a client-side hash router. Instead of making HTTP requests to the server on every navigation click, the client listens to the `hashchange` browser event. When the user selects `#purpose` or `#protect`, React state `currentRoute` updates, and React conditionally renders the corresponding view in the DOM without any page reload."*

---

### 8. JavaScript — async/await (0.1 pts • Frontend / JS)
- **Where in code:** `backend/services/js_concepts.js` (`performAsyncPipeline`), `server.js`, `popup.js`
- **Key points:**
  - Modern syntax built on top of Promises for writing non-blocking asynchronous code that looks and behaves synchronously.
  - Errors are cleanly handled using standard `try...catch...finally` blocks.
  - Parallel execution via `await Promise.all(...)`.
- **Your Viva Answer:**
  > *"`async/await` is syntactic sugar over native Promises. An `async` function always returns a Promise, and `await` pauses execution of that function until the Promise settles, without blocking the JavaScript main thread. We use `try/catch` for clean exception handling and `Promise.all` when scanning multiple documents concurrently."*

---

### 9. JavaScript — Closures (0.1 pts • Frontend / JS)
- **Where in code:** `backend/services/js_concepts.js` (`createRateLimiter`, `createAuditLogger`)
- **Code:**
  ```javascript
  function createRateLimiter(maxRequests = 5, windowMs = 1000) {
      let count = 0;          // Private state
      let windowStart = Date.now();

      return function checkLimit() { // Closure retaining count and windowStart
          const now = Date.now();
          if (now - windowStart > windowMs) { count = 0; windowStart = now; }
          count++;
          return { allowed: count <= maxRequests, currentCount: count };
      };
  }
  ```
- **Your Viva Answer:**
  > *"A closure is the combination of a function bundled together with references to its surrounding lexical environment. In PrivacyGuard, we use closures in `createRateLimiter`: the returned function retains access to the private variables `count` and `windowStart` even after `createRateLimiter` has finished executing, effectively achieving data encapsulation without global variables."*

---

### 10. JavaScript — Event Loop (0.1 pts • Frontend / JS)
- **Where in code:** `backend/services/js_concepts.js` (`runEventLoopDemonstration`)
- **Execution Order:**
  1. **Synchronous code** on the Call Stack.
  2. **Microtasks Queue:** `Promise.resolve().then(...)`, `queueMicrotask()` (executed immediately after Call Stack empties, before the next tick).
  3. **Macrotasks Queue:** `setTimeout()`, `setInterval()`, `setImmediate()`, I/O.
- **Your Viva Answer:**
  > *"JavaScript is single-threaded and coordinates concurrency via the Event Loop. When synchronous code on the Call Stack finishes, the Event Loop first drains the entire Microtask Queue (`Promise.then` and `queueMicrotask`) before picking up any task from the Macrotask Queue (`setTimeout` or I/O events). Our automated test confirms this exact execution sequence."*

---

### 11. JavaScript — Hoisting (0.1 pts • Frontend / JS)
- **Where in code:** `backend/services/js_concepts.js` (`testHoistingBehaviors`)
- **Key points:**
  - **Function declarations** are completely hoisted with both name and body (can be called before line of definition).
  - **`var` declarations** are hoisted and initialized to `undefined`.
  - **`let` and `const`** are hoisted into the **Temporal Dead Zone (TDZ)**; accessing them before declaration throws a `ReferenceError`.
- **Your Viva Answer:**
  > *"Hoisting is JavaScript's compilation-phase behavior of allocating memory for declarations before code execution. Function declarations are fully hoisted with their implementation, while `var` variables are hoisted with an initial value of `undefined`. Conversely, `let` and `const` are kept in the Temporal Dead Zone (TDZ) and cannot be accessed before their declaration line."*

---

### 12. JavaScript — Promises vs Callbacks (0.1 pts • Frontend / JS)
- **Where in code:** `backend/services/js_concepts.js` (`promisify`, `modernPromiseScanner`)
- **Key differences:**
  - Callbacks pass an error-first function `(err, data) => {}` as an argument, often leading to unreadable, deeply nested "callback hell".
  - Promises represent an eventual completion or failure of an async operation with `.then()`, `.catch()`, and `.finally()`, enabling linear chaining and seamless `async/await` integration.
- **Your Viva Answer:**
  > *"While traditional Node.js relies on error-first callbacks `(err, data)`, they lead to inversion of control and deeply nested callback hell. Promises solve this by providing first-class objects representing asynchronous values that can be chained, caught cleanly with `.catch()`, or written synchronously using `async/await`. We demonstrated this with our `promisify()` utility."*

---

### 13. React Component Composition (0.2 pts • Frontend)
- **Where in code:** `Privacy Guard/html/react_app.html`
- **Implementation:**
  - Composing a master layout by nesting smaller, single-purpose components using `children` and specialized props:
    ```jsx
    <Card>
        <CardHeader 
            title="Purpose-Aware Minimization" 
            badge="React Composition" 
            action={<span className="concept-badge">{detected.length} Found</span>} 
        />
        <CardBody>
            <EntityList items={detected} decisions={decisions} onToggle={toggle} />
        </CardBody>
        <CardFooter>
            <Button onClick={handleProtect}>Generate Safe Document</Button>
        </CardFooter>
    </Card>
    ```
- **Your Viva Answer:**
  > *"Component composition in React means assembling complex UIs by combining smaller, focused components rather than relying on deep class inheritance. In our PrivacyGuard React app, we created generic `<Card>` container components that accept `<CardHeader>`, `<CardBody>`, and `<CardFooter>` through the `children` prop, making our UI modular, reusable, and easy to maintain."*

---

### 14. Side Effects with useEffect (0.2 pts • Frontend)
- **Where in code:** `Privacy Guard/html/react_app.html`
- **Examples implemented:**
  1. **Event Listener & Cleanup:**
     ```jsx
     useEffect(() => {
         const handleHash = () => setCurrentRoute(window.location.hash || '#/scan');
         window.addEventListener('hashchange', handleHash);
         return () => window.removeEventListener('hashchange', handleHash);
     }, []); // Empty dependency array: runs once on mount
     ```
  2. **Data Fetching:**
     ```jsx
     useEffect(() => {
         fetch('/api/stats')
             .then(res => res.json())
             .then(data => setStats(data.stats));
     }, []);
     ```
  3. **Document Title Synchronization:**
     ```jsx
     useEffect(() => {
         document.title = `PrivacyGuard | ${currentRoute.toUpperCase()}`;
     }, [currentRoute]); // Runs whenever currentRoute changes
     ```
- **Your Viva Answer:**
  > *"In React, pure functional components should not directly mutate the DOM or trigger network requests during render. We use `useEffect` to isolate these side effects. We demonstrated three patterns: 1) Data fetching on mount, 2) Syncing the browser tab title when `currentRoute` updates, and 3) Registering a `hashchange` window event listener with a cleanup function to prevent memory leaks."*

---

### 15. State Management with useState (0.2 pts • Frontend)
- **Where in code:** `Privacy Guard/html/react_app.html`
- **State variables:**
  - `const [currentRoute, setCurrentRoute] = useState(window.location.hash || '#/scan');`
  - `const [text, setText] = useState('...');`
  - `const [detected, setDetected] = useState([]);`
  - `const [decisions, setDecisions] = useState({});`
  - `const [isScanning, setIsScanning] = useState(false);`
- **Your Viva Answer:**
  > *"`useState` is a React Hook that declares reactive state variables within a functional component. When the state update function (such as `setDecisions`) is called, React schedules a re-render of the component with the new state. In our app, we use `useState` to track input text, detected PII entities, purpose selection, and UI loading states."*

---

### 16. CRUD Operations (Mongo) (0.2 pts • NoSQL)
- **Where in code:** `backend/database/mongo_crud.py` and `backend/database/mongo_service.js`
- **Operations:**
  - **Create:** `create_audit_event(...)` inserts an audit document with generated ObjectId.
  - **Read:** `get_audit_event_by_id(id)` and `find_audit_events_by_document(doc_id)`.
  - **Update:** `update_audit_event_status(...)` performs an atomic `$set` update on metadata.
  - **Delete:** `delete_audit_event(id)` deletes by ObjectId.
- **Flexible Schema Modeling (Viva Q6):**
  - Uses Pydantic `AuditMetadata` with `Dict[str, int]` and custom validator `validate_non_negative_counts` to ensure variable entity categories can be stored dynamically without schema migrations while strictly enforcing non-negative integer counts.
- **Your Viva Answer:**
  > *"For our audit trail in MongoDB, we implemented full CRUD operations. To model dynamic entity counts safely without breaking schema rigidity, we use a Pydantic model where `entity_counts` is a `Dict[str, int]` validated by a custom field validator that rejects negative counts. This gives us NoSQL flexibility for new PII categories while preserving strict type safety."*

---

### 17. SQL JOINs (0.2 pts • SQL / Postgres)
- **Where in code:** `backend/database/sql_joins.py` and `backend/database/sql_schema.sql`
- **Key Queries:**
  1. **INNER JOIN** (Documents matching Scans):
     ```sql
     SELECT d.filename, s.risk_score, s.risk_level
     FROM documents d
     INNER JOIN scans s ON d.id = s.document_id;
     ```
  2. **LEFT OUTER JOIN** (Users and upload counts, preserving users with 0 uploads):
     ```sql
     SELECT u.name, u.email, COUNT(d.id) AS total_documents_uploaded
     FROM users u
     LEFT JOIN documents d ON u.id = d.user_id
     GROUP BY u.id, u.name, u.email;
     ```
  3. **Multi-Table JOIN with PK/FK Integrity** (Users -> Documents -> Scans -> Audit Events):
     ```sql
     SELECT u.name, d.filename, s.risk_score, a.action_taken, a.pii_type
     FROM users u
     INNER JOIN documents d ON u.id = d.user_id
     INNER JOIN scans s ON d.id = s.document_id
     INNER JOIN audit_events_relational a ON s.id = a.scan_id
     ORDER BY a.timestamp DESC;
     ```
- **Your Viva Answer:**
  > *"In our relational database design, we defined primary and foreign keys linking `users` -> `documents` -> `scans` -> `audit_events_relational` with `ON DELETE CASCADE`. We wrote an `INNER JOIN` to match documents with scan results, a `LEFT OUTER JOIN` to aggregate uploads per user even if a user has uploaded zero documents, and a 4-table relational join to build an end-to-end data provenance audit trail."*

---

## ⚡ How to Run & Demonstrate Everything to the Examiner

1. **Run the Full 17-Concept Automated Verification Suite:**
   ```powershell
   npm test
   ```
   *(Shows: `🎉 TEST SUMMARY: 17 PASSED, 0 FAILED — 100% SUCCESS`)*

2. **Run the SQL JOINs Script Live:**
   ```powershell
   & ".venv/Scripts/python.exe" backend/database/sql_joins.py
   ```

3. **Run the MongoDB CRUD Script Live:**
   ```powershell
   & ".venv/Scripts/python.exe" backend/database/mongo_crud.py
   ```

4. **Start the Universal Server:**
   ```powershell
   npm start
   ```
   Open `http://127.0.0.1:8000/app` to demonstrate the interactive React Single-Page Application!
