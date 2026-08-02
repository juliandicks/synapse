# Changelog

## [1.0.0] — 2026-08-02

### Added
- Stable v1 API for the canvas graph engine, renderer, loader, interaction handler, and TypeScript types.
- Viewport-aware layout configuration for embedded and smaller canvases.
- Resizable philosophy demo canvas positioned beside the control panel.
- Horizontal layout label-width reserve so responsive canvases keep typical side labels visible.

### Changed
- Responsive layout now squishes horizontal offsets, right-zone distance, vertical offsets, and node spacing toward configured minimums while preserving padded bounds where possible.

## [0.3.0] — 2026-08-02

### Added
- Philosophy demo search, history controls, keyboard shortcuts, and metadata panel.

### Changed
- Demo keyboard navigation is parent-owned and uses `Tab` / `Shift+Tab` to focus visible nodes and `Enter` to navigate.
- Demo keyboard focus order includes the center node for completeness.

## [0.2.0] — 2026-08-02

### Added
- Parent-controlled navigation callbacks with source labels.
- Parent-controlled input callbacks for node/curve activation and hover events.
- Node search helper with parent-provided matcher support.
- Pure graph query helpers for visible, connected, incoming, outgoing, and peer nodes.
- Input handler cleanup via `destroy()`.

### Changed
- Input handling now uses pointer events for mouse, touch, and stylus activation.
- Example data normalization stays in parent code before calling `loadGraphData`.
- Minimum Node engine is now current LTS, `>=24.18.1`.

### Fixed
- Added the missing DOM test environment dependency.
- Updated audited development transitive dependencies.

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
