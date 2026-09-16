# Verification, Citations & Anti-Hallucination

This document describes how Hikmah enforces strict fact verification, source authority scoring, and citation generation.

---

## 1. Source Classification & Authority Levels

Sources are categorized according to their provenance and assigned authority tiers from 1 (highest) to 10 (unverified):

| Authority Tier | Domain Examples | Classification |
| :--- | :--- | :--- |
| **1-2** (Primary/Official) | `.gov`, `.mil`, `.edu`, `rfc-editor.org`, `w3.org`, `doi.org` | `PRIMARY` |
| **3-4** (Major Journalistic / Repos) | `reuters.com`, `apnews.com`, `github.com`, `nature.com` | `SECONDARY` |
| **5-6** (General Web / Tech Blogs) | `techcrunch.com`, `arstechnica.com`, `wikipedia.org` | `SECONDARY` / `TERTIARY` |
| **7-8** (Forums / Social) | `reddit.com`, `news.ycombinator.com`, `x.com` | `UNVERIFIED` |
| **9-10** (Aggregators / Unknown) | Arbitrary non-attributed scrapers | `UNVERIFIED` |

---

## 2. Duplicate Story Detection (Wire-Service Defense)

A common pitfall in web research is "circular confirmation": five different regional news sites republishing the exact same Associated Press or PR Newswire release verbatim.

To prevent counting this as five independent corroborations:
- The `DuplicateStoryDetector` computes a fingerprint of the first 20 words of each article text.
- Articles sharing identical opening text fingerprints are grouped into a single story cluster.
- When evaluating claim corroboration, multiple citations within the same cluster are counted as **one single source of origin**.

---

## 3. Anti-Hallucination Citation Validation

The `CitationEngine` enforces the core anti-hallucination rule:
1. Every citation in the generated report must reference a valid `sourceId` present in the retrieved `sources` map.
2. If a claim lacks an authentic supporting evidence snippet with a corresponding content hash, it cannot be rendered as `CORROBORATED`.
3. Claims lacking citations are tagged with `⚠️ [Unverified]` in the generated report so users and agents immediately distinguish verified ground truth from speculative statements.
