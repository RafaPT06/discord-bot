# Internal restore endpoint

`POST /api/guilds/:guildId/layout/snapshots/:snapshotId/restore`

Request body supports `mode` (`merge` or `replace`), `actorId`, and `confirmServerName`. Replace requires `confirmServerName` to exactly match the current Discord server name. The endpoint uses the same internal bot API authorization as the existing Server Layout routes and serializes restores per guild.

Successful responses include the safety snapshot ID, created/updated/removed/skipped resources, and old-to-new role/channel ID maps.
