# J.A.R.V.I.S. — Security & Safety Specification

## 1. Zero-Trust Security Philosophy
Every action performed by JARVIS passes through deterministic guardrails before hitting external networks, operating system calls, or persistent storage.

## 2. Guardrail Layers
1. **Input Sanitization**: Control characters and malicious escape sequences are stripped prior to prompt construction.
2. **Deterministic Risk Rating**: Every tool explicitly declares its operational risk. Dynamic payload analysis elevates risk for destructive commands (`rm -rf`, `drop table`, `format`).
3. **Approval Gating (Human-In-The-Loop)**: Actions classified as `HIGH` or `CRITICAL` generate an `ApprovalRequest` ticket and block execution until operator authorization is granted.
4. **Master Kill-Switch**: A persistent circuit breaker in `core/safety/classifier.ts`. When toggled, all tool calls, agent runs, and background tasks are immediately rejected.
5. **Correlation ID Tracking**: Every transaction receives a `request_id`, `conversation_id`, `agent_run_id`, and `job_id` logged to a structured audit stream.
6. **Filesystem Sandboxing**: Workspace file readers are strictly confined within the project directory root.

---

## 3. Cellular & Geolocation Privacy Boundaries (PRD 07)
1. **Zero Raw Identifiers**: IMEIs, IMSIs, phone numbers, and MAC addresses are never stored in cleartext. Devices are represented strictly by salted SHA-256 hashes (`deviceIdHash`).
2. **Opt-In Consent Gating**: Telemetry packets submitted without an active `GRANTED` state in `device_consents` are discarded immediately before ingestion.
3. **No Carrier-Level Tracking**: Hikmah strictly restricts cellular queries to public open data (OpenCelliD) and consenting clients. Carrier subscriber databases and unlawful intercept interfaces are strictly prohibited.
4. **Attribution Integrity**: OpenCelliD community attribution (CC-BY-SA 4.0) is systematically attached to all queried cell records.

---

## 4. Memory Security, Secret Scanning & Injection Defense (PRD 08A)
1. **Zero-Trust Secret Scanner**: Scans all incoming memory writes for API keys, private keys, JWTs, database connection strings, and passwords. Detected credentials are immediately redacted prior to storage.
2. **Untrusted Memory Framing**: Memories are treated as untrusted external data. `PromptGuard` frames retrieved context in XML boundaries with injection risk warnings, strictly preventing memory-based prompt injection from executing direct tools.
3. **Strict Authority Hierarchy**: Prevents untrusted model inferences or web scrapes from overwriting explicit user preferences (`USER_EXPLICIT` > `VERIFIED_SYSTEM_DATA` > `MODEL_INFERENCE`).
4. **Isolation Boundaries**: Multi-user and multi-project scopes are strictly enforced; memories from one project cannot leak into unauthorized sessions.

---

## 5. Universal Storage Security & Envelope Encryption (PRD 10)
1. **AES-256-GCM Envelope Encryption**: Sensitive objects encrypted with random per-object Data Encryption Keys (DEKs) wrapped by master key (`STORAGE_MASTER_KEY`).
2. **Zero Credential Leakage in TG-S3**: Telegram bot tokens, MTProto credentials, and private channel IDs are completely isolated within backend adapters; zero exposure to frontend or model reasoning context.
3. **Path Traversal Guards**: Sandboxed local filesystem adapter strictly validates canonical paths against the root storage directory.

---

## 6. Web Research SSRF & Anti-Hallucination Security (PRD 11)
1. **Kernel-Level SSRF Protection (`HttpSecurityGuard`)**:
   - Outbound HTTP requests strictly block `127.0.0.1`, `localhost`, `::1` (Loopback).
   - Blocks private RFC-1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
   - Blocks cloud instance metadata endpoints (`169.254.169.254`).
   - Forbids non-HTTP protocols (`file://`, `gopher://`, `ftp://`).
2. **Scraped Content Untrusted Framing**: Web pages are isolated in `<untrusted_web_content>` XML tags to prevent indirect prompt injection attacks.
3. **Anti-Hallucination Grounding Rule**: Every factual claim requires an authentic retrieved evidence snippet with content hash; unverified statements are explicitly flagged as `[Unverified]`.

---

## 7. Browser Intelligence SSRF, Quarantine & Isolation Security (PRD 12)
1. **Browser Navigation SSRF Guard (`BrowserSecurityGuard`)**:
   - Strictly blocks navigation to loopback (`127.0.0.1`, `localhost`, `::1`), private RFC1918 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and link-local cloud metadata services (`169.254.169.254`, `metadata.google.internal`).
   - Forbids dangerous browser schemes (`file:`, `chrome:`, `javascript:`, and raw data execution).
2. **Download Quarantine**:
   - Strictly prohibits downloading executable or script extensions (`.exe`, `.bat`, `.cmd`, `.ps1`, `.vbs`, `.sh`, `.scr`, `.msi`, `.dll`).
3. **Cookie Jar & Profile Sandboxing**:
   - Persistent profiles and active sessions are strictly partitioned; cookies and storage state cannot leak across distinct identities.
4. **Header Redaction**:
   - Network traces and audit logs automatically sanitize authentication tokens (`Authorization`, `Cookie`, `X-API-Key`, `Proxy-Authorization`).




