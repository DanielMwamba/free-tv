# Project Instructions

## Product context

- Build a private, non-commercial web application for the owner and friends to browse and play legitimately free television streams.
- Use the Free-TV/IPTV playlist as an initial catalogue source, without implying that every third-party stream is guaranteed, licensed, or available in every country.
- Never bypass DRM, authentication, geographic restrictions, broadcaster advertising, or player branding.
- Prefer direct client-side playback. Do not proxy or restream third-party media unless explicit permission is documented.

## Engineering workflow

- Keep every commit atomic: one coherent change, with its relevant tests and documentation.
- Before starting a change, inspect `git status` and preserve unrelated work.
- Run the relevant checks before committing. Do not commit known failing checks.
- Use Conventional Commit messages such as `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, and `chore:`.
- Never commit secrets, credentials, generated caches, build output, or user-specific configuration.
- Update this file when durable project conventions change; keep transient progress in Git history, issues, or a dedicated project-status document.

## Application rules

- Use TypeScript with strict type checking.
- Treat playlist and stream metadata as untrusted input: validate URLs and render text safely.
- Support HLS through `hls.js` with native HLS fallback where appropriate.
- Use official embedded players for YouTube and Dailymotion content.
- Fail gracefully when a stream is offline, geo-blocked, mixed-content, or incompatible with browser CORS policies.
- Keep the interface responsive, keyboard accessible, and usable on phones, desktops, and television-sized displays.

## Quality gates

- Add or update tests for playlist parsing and other deterministic business logic.
- Run formatting, linting, type checking, tests, and the production build before milestone commits.
- Do not weaken security headers, URL validation, accessibility, or test coverage merely to make a check pass.

## Documentation

- Keep `README.md` accurate for setup, development, testing, and known playback limitations.
- Record meaningful architectural decisions when they become stable.
