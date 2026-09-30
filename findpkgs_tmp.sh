#!/bin/sh
cd ~/Storacha-Solana-SDK || exit 1
find . -path ./node_modules -prune -o -path ./.git -prune -o -name package.json -print
