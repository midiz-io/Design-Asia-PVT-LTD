# TaskVision PWA Optimization Notes

## How to capture baseline metrics

- Open the app in Chrome on Android (installed PWA or browser) and on desktop.
- Run Lighthouse in DevTools for:
  - `/` (shell redirecting to dashboard)
  - `/tasks` (heaviest screen)
- Record:
  - Performance, PWA, Best Practices scores
  - LCP, INP, CLS, TBT
  - Total JS size and number of requests

## After optimizations

- Re-run the same Lighthouse tests and compare:
  - Note improvements or regressions for each metric.
  - Pay special attention to LCP on `/tasks` and offline behavior.

Use this file as a living log whenever you change PWA/performace-related code.


