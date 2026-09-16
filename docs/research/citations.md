# Citations & Anti-Hallucination Guard

Hikmah enforces the strict anti-hallucination rule:
$$\text{No Supporting Source} \implies \text{Do Not Present as Verified Fact}$$

---

## 1. Citation Generation Pipeline

1. **Extraction**: As claims are synthesized, candidate citations `[^n]` are linked to `sourceId` and `evidenceId`.
2. **Validation**: `CitationEngine.validateCitations(citations, sources)` verifies that:
   - The source URL actually exists in the retrieved corpus.
   - The cited evidence text exists in the page's extracted content.
   - Any hallucinated URL or ungrounded citation is stripped or marked unverified.
3. **Rendering**: Markdown reports render standard GitHub footnotes `[^1]` with publisher, author, date, and link.

---

## 2. Unverified Claim Tagging

If a user prompt or report contains an assertion that cannot be verified by retrieved sources:
- Tagged with `⚠️ [Unverified]`.
- Frame qualified: *"According to unconfirmed commentary..."* or *"Preliminary assertion not verified by primary documentation."*
