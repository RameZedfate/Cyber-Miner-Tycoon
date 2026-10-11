---
name: howtravle-top2-email
description: Use when running or maintaining Adam's HOWTRAVLE daily Trip.com Top 2 flight-card and email workflow with live refresh, exact itinerary checks, Skyscanner comparison, and evidence-backed delivery.
---

# HOWTRAVLE Trip.com Top 2 Email

Use this skill for the recurring HOWTRAVLE flight-deal workflow. Refresh live data first and never resend stale files.

## Candidate rules

- Keep round-trip flights originating in Taiwan with direct outbound and return legs.
- Exclude Taiwan domestic routes and Manila.
- Departure must be within 90 days; trip length must be 1–8 days.
- Trip.com round-trip price must be below NT$15,000; Hong Kong qualifies only at NT$4,000 or lower.
- Deduplicate by origin/destination airport pair and take the cheapest two qualifying routes.

## Skyscanner gate

For each candidate, compare the exact origin and destination airports, outbound and return dates, economy cabin, one adult, round trip, and direct flights. Compare total round-trip prices only. If a lower comparable Skyscanner price exists, exclude the candidate. If CAPTCHA or another block prevents verification, stop before email sending and record `delivery_status: delivery_blocked` plus `reason: skyscanner_unverified` in diagnostics.

## Outputs and verification

1. Produce exactly two PNG cards plus the matching Markdown/JSON report and diagnostics.
2. Verify card count, route, dates, displayed price, dimensions, and working public affiliate link.
3. Do not store SMTP credentials, cookies, API keys, or recipient addresses in Git.
4. Send email only in an already-authorized scheduled workflow with a configured private sender. Verify the mail result and attachments; otherwise stop with the completed local artifacts.
5. Do not post to Threads or another social platform.
