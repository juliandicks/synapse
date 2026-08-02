# Changelog

## [Unreleased]

### Added
- Node search helper with parent-provided matcher support.
- Pure graph query helpers for visible, connected, incoming, outgoing, and peer nodes.
- Navigation callbacks with source labels for parent-owned history and UI.
- Input callbacks for node/curve click and hover events.
- Input handler cleanup via `destroy()`.
- Philosophy demo search, history controls, and metadata panel.

## [0.1.0] — 2026-07-06

Initial release.

### Added
- Animated graph navigation engine (Cortex)
- Canvas renderer with bezier curves and node/edge styling
- Mouse interaction (click to navigate, hover to highlight)
- Built-in philosophy dataset: 76 philosophers, 114 influence/peer edges
- Automatic zone-based layout (top, bottom, left, right zones)
- Vite library build (ESM + CJS + TypeScript declarations)
- Demo application with tradition/period color mapping
- Vitest test suite
- GitHub Actions CI/CD (lint, test, build, publish, GitHub Pages deploy)
- Documentation: README, CONTRIBUTING, CODE_OF_CONDUCT, examples
