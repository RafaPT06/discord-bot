# Rollback foundation

Every execution returns the ID of a safety snapshot captured immediately before changes begin. That snapshot is the rollback source for a later dedicated rollback action. This branch does not automatically run a second destructive restore when an operation fails; automatic rollback needs its own reviewed failure policy.
