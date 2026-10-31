# Restore endpoint security

The execution endpoint is an internal bot API route and uses the same authorization boundary as the existing Server Layout bot routes. The browser must never call this bot endpoint directly. The website will proxy execution only after its existing Discord session and Manage Server checks pass. Replace additionally requires exact server-name confirmation, and concurrent restores for the same guild are rejected.
