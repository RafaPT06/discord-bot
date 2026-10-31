# Failure behavior

A restore error is returned to the website and the per-server execution lock is released in a `finally` block. The safety snapshot is created before Discord changes begin. Automatic rollback is intentionally not triggered in this first version because a second restore during a partial failure needs a separately reviewed policy.
