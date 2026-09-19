# FREE TV

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Next.js 16
- React with TypeScript in strict mode
- Tailwind CSS
- shadcn/ui for accessible component primitives
- pnpm as the package manager
- Hosting remains an open decision.

## Users

The primary users are the owner and a small circle of friends. They want a simple way to browse and watch legitimately free television streams from phones, computers, and larger screens.

## Product Purpose

FREE TV provides a private, non-commercial web interface for discovering free television channels and playing compatible streams without requiring a desktop IPTV player such as VLC. Success means reaching a playable channel quickly and understanding clearly when a stream is unavailable or restricted.

## Positioning

The product turns a technical IPTV playlist into a friendly catalogue with browser-appropriate playback: direct HLS where permitted and official embedded players where required.

## Operating Context

- Users browse a channel catalogue, search or filter it, select a channel, and watch it in the same interface.
- The initial catalogue source is the public Free-TV/IPTV playlist.
- Playback happens directly from the broadcaster or source platform whenever possible.
- Availability can vary by browser, country, CORS policy, source uptime, and broadcaster restrictions.

## Capabilities and Constraints

- Parse and validate M3U playlist metadata as untrusted input.
- Support HLS through `hls.js` with an appropriate native HLS fallback.
- Use official embeds for YouTube and Dailymotion sources.
- Present useful offline, incompatible, mixed-content, CORS, and geographic-restriction states.
- Do not bypass DRM, authentication, geographic restrictions, advertising, or player branding.
- Do not proxy or restream third-party media without documented permission.
- Do not claim that every playlist entry is licensed, stable, or available everywhere.
- The primary interface language remains an open decision.

## Brand Commitments

- Product name: FREE TV.
- Personal and non-commercial use.
- The interface should be direct and practical rather than promotional.

## Evidence on Hand

- Initial catalogue: `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8`
- No proprietary logo, photography, testimonials, audience metrics, or broadcaster partnerships exist. Future work must not fabricate them.

## Product Principles

- Make finding and starting a channel fast.
- Be honest about availability and playback limitations.
- Preserve broadcaster controls, attribution, advertising, and restrictions.
- Keep the experience usable across mobile, desktop, and television-sized displays.
- Prefer a small dependable catalogue over the appearance of unlimited access.

## Accessibility & Inclusion

The core browsing and playback flows must be keyboard accessible, expose visible focus states, support reduced motion, and retain readable contrast and touch targets across supported screen sizes.
