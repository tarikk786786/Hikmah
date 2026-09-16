# Claim Verification & Conflict Resolution

Hikmah subjects extracted facts to automated cross-checking across independent sources to resolve consensus vs contradiction.

---

## 1. Claim Status Classification

| Status | Definition |
| :--- | :--- |
| `UNCHECKED` | Extracted assertion pending verification. |
| `SUPPORTED` | Confirmed by 1 reliable source. |
| `CORROBORATED` | Confirmed by 2+ independent, non-syndicated sources. |
| `CONTRADICTED` | Disputed by an opposing high-authority source. |
| `UNVERIFIED` | No supporting source found in retrieved materials. |
| `OUTDATED` | Fact superseded by a newer timestamped event. |

---

## 2. Contradiction Detection

When two sources assert conflicting facts (e.g. differing dates or statistics):
1. Both assertions are recorded with their respective source references.
2. The report highlights the dispute under the `Conflicting Assertions & Ambiguities` section.
3. Authority rankings are compared, but the system does *not* silently erase disagreements.
