# Automatic restore snapshot

The executor creates a new layout snapshot immediately before applying changes. Its ID is returned as `safetySnapshotId`, providing a known pre-change structure for the later rollback workflow.
