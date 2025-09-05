Fork this repo, and cd into the `sdk` directory.

Add your changes and ensure you test them locally by running `pnpm build` then pack it with `pnpm pack`

When that's done, add the tarball as a link in your `package.json` like so:

```json
  "storacha-sol": "file:../sdk/storacha-sol-0.0.1.tgz"
```

Or better still, test the changes in the `frontend` directory.

When you're set, open a PR, and expect a review.
