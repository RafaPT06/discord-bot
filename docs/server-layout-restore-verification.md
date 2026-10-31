# Verification

Run the lightweight checks with Node before deployment:

```bash
node scripts/test-server-layout-validation.js
node scripts/test-server-layout-source.js
node scripts/test-server-layout-restore.js
node scripts/check-server-layout-restore.js
```

Then use the disposable-server checklist in `docs/server-layout-restore-testing.md` before enabling website execution.
