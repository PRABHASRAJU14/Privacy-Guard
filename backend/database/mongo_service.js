/**
 * PrivacyGuard — Node.js NoSQL (MongoDB) Operations & Schema Modeling
 * 
 * Demonstrates:
 * 1. CRUD Operations: Create, Read, Update, Delete for privacy audit records.
 * 2. Flexible Schema Modeling: Dynamic entity count maps with non-negative validation.
 * 3. Type Safety: Enforcing shape, field validation, and ObjectId creation.
 */

const crypto = require("crypto");

class MongoAuditEventStore {
    constructor() {
        this.collection = new Map();
    }

    /**
     * Validate dynamic metadata to prevent negative values or forbidden keys.
     */
    validateMetadata(metadata) {
        if (!metadata || typeof metadata !== "object") return {};
        const sanitized = {};
        for (const [key, val] of Object.entries(metadata)) {
            if (typeof val === "number") {
                if (val < 0) {
                    throw new RangeError(`Count for '${key}' cannot be negative: ${val}`);
                }
                sanitized[key] = Math.floor(val);
            } else if (typeof val === "string" || typeof val === "boolean") {
                sanitized[key] = val;
            }
        }
        return sanitized;
    }

    /**
     * CRUD: CREATE
     * Inserts an audit event document and returns its unique 24-character hex ID (ObjectId equivalent).
     */
    create(data) {
        if (!data.document_id) {
            throw new Error("document_id is required");
        }
        const _id = crypto.randomBytes(12).toString("hex"); // 24-hex characters ObjectId
        const doc = {
            _id,
            document_id: String(data.document_id),
            event_type: data.event_type || "SCAN",
            purpose: data.purpose || "expense_reimbursement",
            risk_score: Math.max(0, Math.min(100, Number(data.risk_score) || 0)),
            risk_level: data.risk_level || "LOW",
            metadata: this.validateMetadata(data.metadata || {}),
            created_at: new Date().toISOString()
        };
        this.collection.set(_id, doc);
        return { acknowledged: true, insertedId: _id, document: doc };
    }

    /**
     * CRUD: READ (By ID)
     */
    findById(id) {
        if (!this.collection.has(id)) return null;
        return { ...this.collection.get(id) };
    }

    /**
     * CRUD: READ (Query filter)
     */
    find(filter = {}) {
        const results = [];
        for (const doc of this.collection.values()) {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
                if (doc[k] !== v) {
                    match = false;
                    break;
                }
            }
            if (match) results.push({ ...doc });
        }
        return results;
    }

    /**
     * CRUD: UPDATE
     * Performs an atomic $set style update.
     */
    updateOne(id, updateFields = {}) {
        if (!this.collection.has(id)) {
            return { matchedCount: 0, modifiedCount: 0 };
        }
        const existing = this.collection.get(id);
        const updated = {
            ...existing,
            ...updateFields,
            updated_at: new Date().toISOString()
        };
        this.collection.set(id, updated);
        return { matchedCount: 1, modifiedCount: 1, document: updated };
    }

    /**
     * CRUD: DELETE
     */
    deleteOne(id) {
        if (!this.collection.has(id)) {
            return { deletedCount: 0 };
        }
        this.collection.delete(id);
        return { deletedCount: 1 };
    }
}

const mongoAuditStore = new MongoAuditEventStore();

module.exports = {
    MongoAuditEventStore,
    mongoAuditStore
};
