# Restore ordering

1. Capture automatic safety snapshot.
2. Fetch current roles and channels.
3. Update or recreate saved roles and build the role ID map.
4. Restore categories before child channels.
5. Restore remaining channels and remap category parents.
6. Restore channel permission overrides using remapped role IDs.
7. Reapply saved role and channel positions.
8. In Replace mode only, remove extra channels and non-managed roles.
9. Return the execution report and ID maps.
