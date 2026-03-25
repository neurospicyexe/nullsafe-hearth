# Hearth Security Audit

OWASP + vibesec audit run 2026-03-09. Fixes applied same day.
Completed findings are not tracked here -- they're in git history.

## Open Findings

| Severity | Issue |
|----------|-------|
| LOW | No rate limiting on mutation endpoints -- add `@upstash/ratelimit` if needed |
| LOW | `bridge/act` and `bridge/toggle` bodies forwarded without field allowlists (low risk -- bridge is separately authed) |
