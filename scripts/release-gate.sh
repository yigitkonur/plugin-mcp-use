#!/bin/sh
# Run by .github/workflows/release.yml on the bumped tree before anything is pushed.
node scripts/validate.mjs
