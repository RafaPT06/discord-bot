# Server Layout restore testing

Before enabling the website execute button, test this branch on a disposable Discord server.

1. Create a layout snapshot.
2. Rename one role and one channel, then run Merge restore and verify both return to the saved values.
3. Delete a saved role, category and child channel, then restore and verify new Discord IDs are mapped and the child returns to the recreated category.
4. Verify role permission overrides on recreated channels point at the recreated role.
5. Add an extra channel and confirm Merge preserves it.
6. Add another extra channel and confirm Replace refuses an incorrect server name, then removes the extra channel only after exact-name confirmation.
7. Confirm managed integration/bot roles are not removed.
8. Confirm an automatic safety snapshot exists before every restore.
9. Confirm a second simultaneous restore receives HTTP 409.
10. Review created, updated, removed and skipped resources in the restore response.

Do not test Replace on a production server until the dashboard confirmation flow and website proxy are merged.
