## V1.4.99 — harden browser build-version display
- Bumped the central build version to V1.4.99.
- Added a browser fallback so the build badge does not become “Vunknown” if the runtime build variable is unavailable.
- Made the version regression test validate semantic versioning rather than hard-coding one old release.
- Current build: V1.4.99.

## V1.4.98 — centralised build version
- Made `package.json` the single source of truth for the Collage build version.
- Runtime `/health`, browser build display and sprite cache-busting now derive from the same version.
- Removed the obsolete root-level copies of the live client files so they cannot drift from `public/` again.
- Current build: V1.4.98.

## V1.4.82 — fix Bing result scoping
- Restrict Bing image parsing to the actual image-result grid so unrelated/recommended tiles cannot leak into searches.
- Added a regression search for “joe rogan” to the automated image-search coverage.
- Bumped runtime, client, package and cache-busting versions to 1.4.82.

## V1.4.80 — avatar search means Avatar / Na'vi
- Corrected the special `avatar` search to target James Cameron's Avatar franchise and Na'vi characters.
- Searches Wikimedia Commons Na'vi, Jake Sully, Neytiri and Avatar film categories plus targeted title searches.
- Ranks Na'vi/character results above logos, posters, attractions and unrelated Avatar media.
- Bumped runtime, client, package and cache-busting versions to V1.4.80.

## V1.4.79 — avatar search targets actual profile/avatar graphics
- Reworked the special `avatar` search to pull from Wikimedia Commons' person-avatar and blank-profile categories instead of generic full-text avatar matches.
- Added ranking for profile/avatar/placeholder-style titles and square-ish profile images.
- De-prioritised obvious photo/Second Life-style results so the first results are much closer to generic human profile avatars.
- Kept normal searches unchanged.
- Bumped runtime, client, package and cache-busting versions to V1.4.79.

## V1.4.78 — avatar search uses actual avatar categories
- Reworked the `avatar` search to prioritize Wikimedia Commons avatar/profile-avatar categories instead of generic images merely containing the word “avatar”.
- Prioritizes male/female avatars, Chromium profile avatars, Gravatars and identicons before the broader avatar category.
- Avatar category results are allowed through without the old title-only filter.
- Bumped client/server version and cache bust to 1.4.78.
