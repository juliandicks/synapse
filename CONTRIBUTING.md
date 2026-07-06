# Contributing to Synapse

Thank you for your interest in contributing!

## Code of Conduct

This project is governed by the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating you agree to uphold it.

## How to Contribute

### Report Bugs

Open an [issue](https://github.com/juliandicks/synapse/issues) with:
- A clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS version

### Suggest Features

Open an [issue](https://github.com/juliandicks/synapse/issues) describing the feature, its motivation, and a rough design if applicable.

### Submit Code

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run `npm run typecheck` and `npm test` — all must pass
5. Commit with a descriptive message
6. Push and open a pull request

### Development Setup

```bash
git clone https://github.com/juliandicks/synapse.git
cd synapse
npm install
npm run dev
```

### Project Structure

```
src/
  index.ts          — public barrel exports
  graph.ts          — Cortex engine (nodes, edges, layout, animation)
  renderer.ts       — Canvas renderer
  input.ts          — Mouse interaction handler
  loader.ts         — GraphData loader
  types.ts          — TypeScript types
  constants.ts      — Layout constants, colors, helpers
  data/             — Built-in philosophy dataset
    index.ts        — GraphData export
    nodes.ts        — 76 philosophers
    edges.ts        — 114 relationships
  main.ts           — Demo app entry
  style.css         — Demo app styles
```

### Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Update tests and type declarations if needed
- Update README if the public API changes
- Rebase onto main before final submission
