#!/bin/bash

echo "Generating admin keypair..."
echo ""

mkdir -p ~/.config/solana

solana-keygen new --outfile ~/.config/solana/stosol.json --no-bip39-passphrase

echo ""
echo "Admin keypair generated at ~/.config/solana/stosol.json"
echo ""
echo "Copy this line to your .env file:"
echo ""
echo "ADMIN_KEYPAIR='$(cat ~/.config/solana/stosol.json)'"
echo ""
echo "IMPORTANT: Keep this secret!"
echo ""
