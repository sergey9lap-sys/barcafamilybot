# Barca Family

## Platform
Web: Telegram Mini App and a separate Telegram bot with inline buttons.

## Users and purpose
Russian-speaking Barcelona fans arriving from an author's Telegram channel after a match. Rate the participating players from 1 to 5 quickly, then see community player and team ratings. The author manages matches without editing the database.

## Confirmed constraints
Both bot and Mini App must be independently usable, share votes, support editing, prevent duplicate votes, persist across restarts, and restrict administration by verified Telegram identity. No automatic channel posting. Reference: user-provided Barca Family avatar, navy background and large white lettering. Test: Valencia 0–5 Barcelona. Channel audience: 74,000+; expected bursts of thousands, capacity must be measured.

## Implementation decisions
Node.js backend, PostgreSQL-compatible storage, local SQLite for unhosted tests; small plain JavaScript frontend to minimize loading. These are implementation choices, not claims of user-selected technologies.
Match rating per player: mean of submitted scores. Team rating: equal-weight mean of rated player means. Season player rating: equal-weight mean across closed rated matches. Season team rating: equal-weight mean of closed match team ratings. Missing ratings excluded. Live results are provisional. Demo data kept separate from production.

## Open decisions
Verified owner Telegram ID, final name, hosting provider, production database credentials and HTTPS URL. Default voting window proposed: 24 hours. Match squad requires confirmation before real publication.
