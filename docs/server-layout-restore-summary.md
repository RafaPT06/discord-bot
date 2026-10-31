# Implementation summary

The bot now has the execution primitive needed by the website restore workflow. It creates a pre-change snapshot, restores saved roles and channels in dependency order, remaps recreated IDs, reapplies channel overrides and ordering, supports Merge and Replace cleanup, rejects concurrent runs, and returns a structured result. The website execute control remains a separate change.
