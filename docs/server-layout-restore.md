# Server Layout restore

Every restore creates a safety snapshot before changes begin. Only one restore can run for a server at a time. Merge preserves extra resources. Replace requires exact server-name confirmation. Discord-managed roles are preserved. Recreated roles and channels are remapped so channel parents and role permission overrides can follow new Discord IDs. Existing channels with a different type are skipped rather than converted automatically. Restore responses report created, updated, removed and skipped resources, the safety snapshot ID, and generated ID maps.
