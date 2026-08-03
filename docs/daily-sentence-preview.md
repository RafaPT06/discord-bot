# Daily sentence preview

The upgraded daily sentence service sends one production-only preview after this release.

- The preview is sent once per target user and PostgreSQL database.
- It uses `DAILY_SENTENCE_USER_ID`, falling back to `OWNER_ID`.
- It advances the phrase sequence so the next scheduled phrase is different.
- When deployed after the normal 21:30 Europe/Lisbon schedule, the preview counts as that day's phrase to avoid a duplicate DM.
- Local development does not trigger the automatic preview unless it is running with production/Railway environment markers.

The normal daily schedule remains 21:30 Europe/Lisbon.
