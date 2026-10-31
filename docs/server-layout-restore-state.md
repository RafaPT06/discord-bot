# Execution state

A per-server in-memory lock prevents overlapping restore calls in one bot process. The lock is always released after success or failure.
