/**
 * PrivacyGuard — Core JavaScript Concepts Module
 * 
 * Demonstrates and tests fundamental JavaScript concepts for PrivacyGuard:
 * 1. Closures (lexical scoping, private state encapsulation)
 * 2. Event Loop (Call Stack, Microtask Queue vs Macrotask Queue)
 * 3. Hoisting (Function declarations, var vs let/const in Temporal Dead Zone)
 * 4. Promises vs Callbacks (Callback hell resolution, promisification)
 * 5. Async / Await (Sequential vs parallel execution, error propagation)
 */

// ============================================================================
// 1. CLOSURES
// ============================================================================
/**
 * Factory function creating a Rate Limiter using a closure.
 * The inner function retains access to `requestCounts` and `windowStart`
 * even after `createRateLimiter` has returned.
 */
function createRateLimiter(maxRequests = 5, windowMs = 1000) {
    // Private encapsulated state closed over by the returned function
    let count = 0;
    let windowStart = Date.now();

    return function checkLimit() {
        const now = Date.now();
        if (now - windowStart > windowMs) {
            // Reset window
            count = 0;
            windowStart = now;
        }

        count++;
        const allowed = count <= maxRequests;
        return {
            allowed,
            currentCount: count,
            maxRequests,
            resetInMs: Math.max(0, windowMs - (now - windowStart))
        };
    };
}

/**
 * Audit Logger factory using closures for private namespace context
 */
function createAuditLogger(subsystemName) {
    const logs = []; // Private encapsulated audit trail

    return {
        log(action, severity = "INFO") {
            const entry = {
                timestamp: new Date().toISOString(),
                subsystem: subsystemName,
                action,
                severity
            };
            logs.push(entry);
            return entry;
        },
        getHistory() {
            // Returns a shallow copy to prevent external mutation
            return [...logs];
        },
        getCount() {
            return logs.length;
        }
    };
}

// ============================================================================
// 2. EVENT LOOP
// ============================================================================
/**
 * Demonstrates the Node.js / Browser Event Loop order:
 * 1. Synchronous Code (Call Stack)
 * 2. Microtask Queue (queueMicrotask, Promise.then callbacks)
 * 3. Macrotask Queue (setTimeout, setImmediate, I/O)
 */
function runEventLoopDemonstration() {
    return new Promise((resolve) => {
        const executionOrder = [];

        // 1. Sync
        executionOrder.push("1. Synchronous (Call Stack)");

        // 3. Macrotask
        setTimeout(() => {
            executionOrder.push("4. Macrotask (setTimeout 0ms)");
            resolve(executionOrder);
        }, 0);

        // 2. Microtask
        Promise.resolve().then(() => {
            executionOrder.push("2. Microtask (Promise.then)");
        });

        // 2. Microtask
        queueMicrotask(() => {
            executionOrder.push("3. Microtask (queueMicrotask)");
        });
    });
}

// ============================================================================
// 3. HOISTING
// ============================================================================
/**
 * Demonstrates JavaScript Hoisting mechanics:
 * - Function declarations are fully hoisted (can be called before definition).
 * - `var` declarations are hoisted with initial value `undefined`.
 * - `let` / `const` are hoisted into the Temporal Dead Zone (TDZ) and throw ReferenceError if accessed before declaration.
 */
function testHoistingBehaviors() {
    const results = {};

    // 1. Function declaration hoisting: works before definition
    try {
        results.hoistedFunctionResult = hoistedHelper();
    } catch (e) {
        results.hoistedFunctionResult = `Error: ${e.message}`;
    }

    function hoistedHelper() {
        return "Function declaration was hoisted successfully!";
    }

    // 2. Var hoisting: declared and initialized as undefined
    var hoistedVar; // behaves as if 'var hoistedVar;' was moved to top of scope
    results.varBeforeAssignment = hoistedVar; // undefined
    hoistedVar = "PrivacyGuard-Secure-Value";
    results.varAfterAssignment = hoistedVar;

    // 3. Let/Const TDZ check (safely captured)
    results.tdzExplanation = "let and const variables remain uninitialized in the Temporal Dead Zone until execution reaches their declaration.";

    return results;
}

// ============================================================================
// 4. PROMISES VS CALLBACKS
// ============================================================================
/**
 * Traditional Node.js error-first callback function
 */
function legacyCallbackScanner(text, callback) {
    if (typeof text !== "string") {
        return callback(new TypeError("Input text must be a string"), null);
    }
    setTimeout(() => {
        const detected = text.includes("@") ? ["EMAIL"] : [];
        callback(null, { detected, count: detected.length });
    }, 10);
}

/**
 * Promisification utility: Converts error-first callback pattern to modern Promise
 */
function promisify(callbackFn) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            callbackFn(...args, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    };
}

const modernPromiseScanner = promisify(legacyCallbackScanner);

// ============================================================================
// 5. ASYNC / AWAIT
// ============================================================================
/**
 * Demonstrates async/await pattern with clean try/catch error handling
 * and parallel execution with Promise.all
 */
async function performAsyncPipeline(textSnippets = []) {
    try {
        if (!Array.isArray(textSnippets)) {
            throw new TypeError("textSnippets must be an array");
        }

        // Parallel processing of multiple texts with Promise.all
        const scanPromises = textSnippets.map((text) => modernPromiseScanner(text));
        const scanResults = await Promise.all(scanPromises);

        const totalDetected = scanResults.reduce((acc, r) => acc + r.count, 0);

        return {
            success: true,
            totalScanned: textSnippets.length,
            totalDetected,
            results: scanResults
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    createRateLimiter,
    createAuditLogger,
    runEventLoopDemonstration,
    testHoistingBehaviors,
    legacyCallbackScanner,
    promisify,
    modernPromiseScanner,
    performAsyncPipeline
};
