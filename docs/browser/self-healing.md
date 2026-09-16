# Self-Healing Selector Engine Reference

## 1. Problem Statement
Websites continuously modify DOM structures, change CSS class names, refactor element hierarchies, or adopt CSS modules with randomized hashes (e.g. `.btn_3x9a`). Hardcoded selectors frequently fail after frontend updates.

---

## 2. Multi-Strategy Recovery
When a selector lookup fails, `SelfHealingEngine` attempts 4 sequential recovery strategies:

1. **Fuzzy Attribute & Token Matching**:
   - Parses tokens from the selector (e.g. `#submit-order-button` $\to$ `['submit', 'order', 'button']`).
   - Scans DOM elements for matching IDs, names, placeholders, or aria-labels.
2. **Accessibility Role & Name Matching**:
   - Uses supplied semantic hints (`targetRole`, `targetAriaLabel`) to find elements with matching screen-reader affordances.
3. **Semantic Text Proximity Matching**:
   - Matches element text content against target labels.
4. **Tag & Context Fallback**:
   - Identifies candidate elements with the same tag in the nearest container.

---

## 3. Learned Healed Selector Cache
Once an element is successfully healed, the engine stores the mapping in its in-memory cache:
$$\text{originalSelector} \longrightarrow \text{healedSelector}$$
Subsequent operations using the broken selector resolve in $O(1)$ time without re-evaluating recovery algorithms.
