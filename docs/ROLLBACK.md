# HIKMAH — Production Rollback & Disaster Recovery Procedures

## Rollback Principles

1. **Deterministic State**: Every release corresponds to an immutable Git commit SHA and timestamp.
2. **Database Backward Compatibility**: Database migrations are additive; columns are deprecated before removal to allow previous versions of the application to run without schema breakage.
3. **Emergency Circuit Breaker**: If any provider or external service causes systemic instability, trigger the PAIOS kill switch or transition privacy mode to `offline`.

---

## Rollback Steps

### A. Application Rollback
To revert the application to the previous known stable commit:
```bash
git log -n 5 --oneline
# Identify previous stable commit <PREVIOUS_SHA>
git checkout <PREVIOUS_SHA>
node scratch/build-web.mjs
npm run start
```

### B. Vercel Instant Rollback
1. Navigate to the Vercel project dashboard.
2. Under **Deployments**, locate the prior successful deployment.
3. Click the three dots menu `...` and select **Instant Rollback**.

### C. Emergency Privacy Mode Transition
To immediately cut external dependencies without deploying code:
```bash
curl -X POST http://localhost:3000/api/paios/privacy \
  -H "Content-Type: application/json" \
  -d '{"mode": "air-gapped", "reason": "Emergency disaster recovery isolation"}'
```
