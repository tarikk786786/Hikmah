# Browser Security & SSRF Defense Reference

## 1. Attack Vectors Mitigated
1. **Server-Side Request Forgery (SSRF)**:
   - Blocks navigation to `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`.
   - Blocks private RFC1918 subnets: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
   - Blocks cloud metadata endpoints: `169.254.169.254`, `metadata.google.internal`.
   - Blocks private local domains: `.localhost`, `.local`, `.internal`, `.lan`.
2. **Protocol Smuggling & Injection**:
   - Only `http:`, `https:`, and `about:blank` are permitted.
   - `file:`, `chrome:`, `javascript:`, and raw untrusted `data:` URLs are strictly blocked.
3. **Malicious Download Quarantine**:
   - Downloads of dangerous executable files (`.exe`, `.bat`, `.cmd`, `.ps1`, `.vbs`, `.sh`, `.scr`, `.msi`, `.dll`) are forbidden.
4. **Credential Redaction**:
   - Sensitive HTTP headers (`authorization`, `cookie`, `set-cookie`, `x-api-key`, `proxy-authorization`) are automatically masked in network audit logs.
