# Publishing to NPM

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/signup)
2. **Login**: Run `npm login` and authenticate with your credentials
3. **2FA**: Enable two-factor authentication on your NPM account (required for publishing)

## Pre-publish Checklist

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] Version number is updated in `package.json`
- [ ] `CHANGELOG.md` is updated with the new version
- [ ] README.md reflects any API changes

## Version Management

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.0 → 1.0.1): Bug fixes, no breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

Update the version:

```bash
npm version patch  # or minor, or major
```

This automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag

## Publishing

### Test the package locally

```bash
npm pack
```

This creates a `.tgz` file. Inspect it to ensure only necessary files are included.

### Publish to NPM

```bash
npm publish
```

If your account requires 2FA, you'll be prompted for an OTP code.

### Publish a beta/alpha version

```bash
npm publish --tag beta
```

Users can install with `npm install synapse@beta`.

## Post-publish

1. **Push changes**: `git push && git push --tags`
2. **Create GitHub Release**: Go to [releases](https://github.com/juliandicks/synapse/releases) and create a release from the tag
3. **Announce**: Share on social media, Discord, etc.

## Troubleshooting

### Package name already taken

If `synapse` is taken, you'll need to use a scoped package:

```json
{
  "name": "@juliandicks/synapse"
}
```

Then publish with:

```bash
npm publish --access public
```

### Authentication errors

```bash
npm logout
npm login
```

### Build fails during publish

The `prepack` script runs automatically before publish. If it fails, fix the build issues first:

```bash
npm run build
```

## Unpublishing

To remove a published version (within 72 hours):

```bash
npm unpublish synapse@1.0.0
```

**Warning**: Unpublishing is destructive. Consider deprecating instead:

```bash
npm deprecate synapse@1.0.0 "Use version 1.0.1 instead"
```
