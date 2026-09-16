# Research Security & SSRF Protection

Automated web fetching introduces security risks if an untrusted web page instructs the assistant to query internal endpoints or cloud metadata.

---

## 1. Threat Model & Protections

1. **Server-Side Request Forgery (SSRF)**:
   - Defended by `HttpSecurityGuard`.
   - Every URL is validated before DNS resolution and dispatch.
   - Forbidden:
     - `127.0.0.1`, `localhost`, `::1` (Loopback)
     - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Private RFC-1918)
     - `169.254.169.254` (AWS, GCP, Azure, DigitalOcean instance metadata)
     - `file://`, `gopher://`, `ftp://` (Non-HTTP protocols)

2. **Prompt Injection from Scraped Pages**:
   - Web content is treated strictly as untrusted external text.
   - Framed inside XML isolation boundaries before passing to LLM context (`<untrusted_web_content>`).
   - Instructions inside scraped pages are never executed as system directives.

3. **Denial of Service & Infinite Crawl**:
   - Budget constraints strictly enforce max queries, max page count, max bytes, and max runtime.
