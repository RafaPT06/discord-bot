# Restore concurrency

The internal route keeps an in-process lock per Discord server. A second restore request for the same server receives HTTP 409 until the active restore finishes. Different servers can restore independently.
