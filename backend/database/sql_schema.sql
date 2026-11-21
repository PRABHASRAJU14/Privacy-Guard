-- ============================================================================
-- PrivacyGuard Relational Schema & ORM Architecture (PostgreSQL & SQLite)
-- 
-- Concepts Implemented:
-- 1. Normalization Basics (0NF -> 1NF -> 2NF -> 3NF -> BCNF) (0.2 pts)
-- 2. ORM Usage (Prisma Schema & Sequelize Model Definitions) (0.2 pts)
-- 3. SQL JOINs, Foreign Keys, Referential Integrity & Cascade Rules (0.2 pts)
-- ============================================================================

-- ============================================================================
-- PART 1: NORMALIZATION BASICS (1NF, 2NF, 3NF STEP-BY-STEP)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 0: UNNORMALIZED FORM (0NF / UNF)
-- ----------------------------------------------------------------------------
-- PROBLEM: Multi-valued non-atomic attributes, repeating groups, redundant data.
-- ANOMALIES:
-- 1. Insertion Anomaly: Cannot add a new department without inserting a dummy user/scan.
-- 2. Update Anomaly: Updating a user's department requires updating hundreds of duplicate rows.
-- 3. Deletion Anomaly: Deleting the only scan for a user wipes out their user record.
CREATE TABLE IF NOT EXISTS unnormalized_scans_0nf (
    scan_id VARCHAR(50),
    user_info VARCHAR(255),               -- Non-atomic: "Prabhas Raju, prabhas@kalvium.community, IT Dept"
    document_info VARCHAR(255),           -- Non-atomic: "passport.pdf (SHA256: 3a1f9..., 2.4MB)"
    detected_pii_list TEXT,               -- Repeating group: "AADHAAR: 1234-5678-9012, PHONE: 9876543210"
    purpose_and_retention VARCHAR(150),   -- Non-atomic: "expense_reimbursement, 30 days"
    risk_score INTEGER,
    risk_level VARCHAR(20)
);

-- ----------------------------------------------------------------------------
-- STEP 1: FIRST NORMAL FORM (1NF)
-- ----------------------------------------------------------------------------
-- RULES:
-- 1. Each column contains only ATOMIC (indivisible) values.
-- 2. No repeating groups or comma-separated lists.
-- 3. Each table has a unique PRIMARY KEY.
CREATE TABLE IF NOT EXISTS users_1nf (
    user_id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    department_head VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_findings_1nf (
    scan_id INTEGER NOT NULL,
    pii_type VARCHAR(50) NOT NULL,        -- Atomic single entity (e.g. 'AADHAAR')
    masked_value VARCHAR(100) NOT NULL,
    risk_weight INTEGER NOT NULL,
    PRIMARY KEY (scan_id, pii_type)       -- Composite primary key
);

-- ----------------------------------------------------------------------------
-- STEP 2: SECOND NORMAL FORM (2NF)
-- ----------------------------------------------------------------------------
-- RULES:
-- 1. Must be in 1NF.
-- 2. Eliminate all PARTIAL DEPENDENCIES: No non-key column may depend on only 
--    part of a composite candidate key. All non-key attributes must depend on the WHOLE key.
--
-- EXAMPLE IN 1NF: In scan_findings_1nf (scan_id, pii_type), the attribute 
-- `pii_category_description` depends only on `pii_type`, NOT on `scan_id`.
-- SOLUTION: Separate into a standalone lookup table `pii_categories_2nf`.
CREATE TABLE IF NOT EXISTS pii_categories_2nf (
    pii_type VARCHAR(50) PRIMARY KEY,     -- Fully independent primary key
    category_group VARCHAR(50) NOT NULL,  -- e.g. 'FINANCIAL', 'GOVERNMENT_ID'
    default_severity VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_findings_2nf (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    pii_type VARCHAR(50) NOT NULL,
    masked_value VARCHAR(100) NOT NULL,
    CONSTRAINT fk_2nf_pii_type FOREIGN KEY (pii_type) REFERENCES pii_categories_2nf(pii_type)
);

-- ----------------------------------------------------------------------------
-- STEP 3: THIRD NORMAL FORM (3NF)
-- ----------------------------------------------------------------------------
-- RULES:
-- 1. Must be in 2NF.
-- 2. Eliminate all TRANSITIVE DEPENDENCIES: Non-key columns must not depend on
--    other non-key columns (A -> B and B -> C, therefore A -> C is forbidden).
--
-- EXAMPLE IN 2NF: In users table, `user_id -> department_id` and `department_id -> department_head`.
-- Since `department_head` transitively depends on `user_id` through `department_id`,
-- we extract `departments_3nf`.
CREATE TABLE IF NOT EXISTS departments_3nf (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,     -- 'ENG', 'FIN', 'LEGAL'
    name VARCHAR(100) NOT NULL,
    head_officer VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users_3nf (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    CONSTRAINT fk_users_dept FOREIGN KEY (department_id) REFERENCES departments_3nf(id)
);


-- ============================================================================
-- PART 2: PRODUCTION 3NF RELATIONAL SCHEMA
-- ============================================================================

-- 1. Departments Table (Master Entity)
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Child of Departments)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE SET NULL
);

-- 3. Purposes Table (Master Policy Entity)
CREATE TABLE IF NOT EXISTS purposes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(80) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    max_retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Documents Table (Child of Users)
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_size_bytes INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- 5. Scans Table (Child of Documents & Purposes)
CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    purpose_id INTEGER DEFAULT 1,
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
    detected_count INTEGER NOT NULL DEFAULT 0,
    protected_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) DEFAULT 'COMPLETED',
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_scans_document
        FOREIGN KEY (document_id) REFERENCES documents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_scans_purpose
        FOREIGN KEY (purpose_id) REFERENCES purposes(id)
        ON DELETE RESTRICT
);

-- 6. PII Categories Table (Master Lookup)
CREATE TABLE IF NOT EXISTS pii_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    category_group VARCHAR(50) NOT NULL,
    risk_weight INTEGER NOT NULL DEFAULT 10
);

-- 7. Scan Findings Table (Child of Scans & PII Categories)
CREATE TABLE IF NOT EXISTS scan_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    raw_preview VARCHAR(120),
    masked_value VARCHAR(120) NOT NULL,
    action_taken VARCHAR(30) NOT NULL DEFAULT 'PROTECT',
    CONSTRAINT fk_findings_scan
        FOREIGN KEY (scan_id) REFERENCES scans(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_findings_category
        FOREIGN KEY (category_id) REFERENCES pii_categories(id)
        ON DELETE RESTRICT
);

-- 8. Compliance Receipts Table (1-to-1 Child of Scans)
CREATE TABLE IF NOT EXISTS compliance_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL UNIQUE,
    receipt_hash VARCHAR(64) NOT NULL,
    verified BOOLEAN DEFAULT 1,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_receipts_scan
        FOREIGN KEY (scan_id) REFERENCES scans(id)
        ON DELETE CASCADE
);

-- 9. Relational Audit Events Table (For provenance and compliance history)
CREATE TABLE IF NOT EXISTS audit_events_relational (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    action_taken VARCHAR(50) NOT NULL,
    pii_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_scan
        FOREIGN KEY (scan_id) REFERENCES scans(id)
        ON DELETE CASCADE
);

-- Indexes for Relational Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_doc_risk ON scans(document_id, risk_score);
CREATE INDEX IF NOT EXISTS idx_findings_scan ON scan_findings(scan_id);


-- ============================================================================
-- PART 3: ORM USAGE SPECIFICATION (PRISMA & SEQUELIZE)
-- ============================================================================

/*
-------------------------------------------------------------------------------
A. PRISMA ORM SCHEMA SPECIFICATION (`schema.prisma`)
-------------------------------------------------------------------------------

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Department {
  id        Int      @id @default(autoincrement())
  code      String   @unique
  name      String
  users     User[]
  createdAt DateTime @default(now())
}

model User {
  id           Int         @id @default(autoincrement())
  departmentId Int?
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  name         String
  email        String      @unique
  role         String      @default("user")
  documents    Document[]
  scans        Scan[]
  createdAt    DateTime    @default(now())
}

model Document {
  id         Int      @id @default(autoincrement())
  userId     Int
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  filename   String
  fileHash   String
  scans      Scan[]
  uploadedAt DateTime @default(now())
}

model Scan {
  id            Int                @id @default(autoincrement())
  userId        Int
  user          User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  documentId    Int
  document      Document           @relation(fields: [documentId], references: [id], onDelete: Cascade)
  riskScore     Int
  riskLevel     String             @default("LOW")
  findings      ScanFinding[]
  receipt       ComplianceReceipt?
  auditEvents   AuditEvent[]
  scannedAt     DateTime           @default(now())

  @@index([userId, riskScore])
}

model ScanFinding {
  id          Int    @id @default(autoincrement())
  scanId      Int
  scan        Scan   @relation(fields: [scanId], references: [id], onDelete: Cascade)
  piiType     String
  maskedValue String
  actionTaken String @default("PROTECT")
}

model ComplianceReceipt {
  id          Int      @id @default(autoincrement())
  scanId      Int      @unique
  scan        Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  receiptHash String
  verified    Boolean  @default(true)
  signedAt    DateTime @default(now())
}

model AuditEvent {
  id          Int      @id @default(autoincrement())
  scanId      Int
  scan        Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  actionTaken String
  piiType     String
  timestamp   DateTime @default(now())
}

// PRISMA QUERY EXAMPLES:
// 1. Nested Write (Create Scan with Findings atomically):
// const newScan = await prisma.scan.create({
//   data: {
//     userId: 1,
//     documentId: 10,
//     riskScore: 85,
//     riskLevel: "HIGH",
//     findings: {
//       create: [
//         { piiType: "AADHAAR", maskedValue: "XXXX-XXXX-1234", actionTaken: "PROTECT" },
//         { piiType: "PHONE", maskedValue: "XXXXXX3210", actionTaken: "PROTECT" }
//       ]
//     },
//     receipt: {
//       create: { receiptHash: "sha256_hash_digest_here" }
//     }
//   },
//   include: { findings: true, receipt: true }
// });

// 2. Relational Query with Filtering & Eager Loading:
// const highRiskScans = await prisma.scan.findMany({
//   where: { riskScore: { gte: 70 } },
//   include: { user: true, findings: true, receipt: true },
//   orderBy: { riskScore: 'desc' }
// });
*/

/*
-------------------------------------------------------------------------------
B. SEQUELIZE ORM MODEL SPECIFICATION (JavaScript / Node.js)
-------------------------------------------------------------------------------

const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL || 'sqlite::memory:');

class User extends Model {}
User.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  role: { type: DataTypes.STRING, defaultValue: 'user' }
}, { sequelize, modelName: 'User', tableName: 'users' });

class Scan extends Model {}
Scan.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  risk_score: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 100 } },
  risk_level: { type: DataTypes.STRING, allowNull: false, defaultValue: 'LOW' }
}, { sequelize, modelName: 'Scan', tableName: 'scans' });

class Finding extends Model {}
Finding.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  pii_type: { type: DataTypes.STRING, allowNull: false },
  masked_value: { type: DataTypes.STRING, allowNull: false }
}, { sequelize, modelName: 'Finding', tableName: 'scan_findings' });

// SEQUELIZE ASSOCIATIONS:
User.hasMany(Scan, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Scan.belongsTo(User, { foreignKey: 'user_id' });

Scan.hasMany(Finding, { foreignKey: 'scan_id', onDelete: 'CASCADE' });
Finding.belongsTo(Scan, { foreignKey: 'scan_id' });

// SEQUELIZE TRANSACTION EXAMPLE:
// await sequelize.transaction(async (t) => {
//   const scan = await Scan.create({ user_id: user.id, risk_score: 90, risk_level: 'HIGH' }, { transaction: t });
//   await Finding.bulkCreate([
//     { scan_id: scan.id, pii_type: 'PAN', masked_value: 'XXXXX1234X' }
//   ], { transaction: t });
//   return scan;
// });
*/
