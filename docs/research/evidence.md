# Evidence Collection & Storage

Every assertion in Hikmah is anchored by structured `Evidence` objects that capture raw facts, cryptographic fingerprints, and source provenance.

---

## 1. Evidence Data Model

```typescript
export interface Evidence {
  id: string;                      // Unique ID (ev_...)
  claimId?: string;                // Associated claim ID
  sourceId: string;                // Originating source ID (src_...)
  sourceUrl: string;               // Canonical URL
  text: string;                    // Verbatim extracted excerpt
  location?: string;               // Page number, section header, or timestamp
  contentHash: string;             // SHA-256 hash of text
  capturedAt: string;              // ISO timestamp
  confidence: number;              // 0.0 to 1.0 confidence score
}
```

---

## 2. Integrity Guarantees

- **Immutability**: Once captured, evidence records are write-once and cannot be modified.
- **Cryptographic Hash**: `contentHash` guarantees that quotes cannot be manipulated or hallucinated.
- **Traceability**: An agent or operator can click through any citation directly to the exact source location.
