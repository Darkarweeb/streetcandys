#!/usr/bin/env bash
# =============================================================================
# StreetCandys — Create mobile-capacitor git branch
# Run this FIRST before any other mobile setup steps.
# This preserves the production web deployment untouched.
# =============================================================================

set -e

echo "🌿 Creating mobile-capacitor branch..."

# Ensure we are on main/master first
CURRENT=$(git branch --show-current)
echo "  Current branch: $CURRENT"

# Create and switch to the new branch
git checkout -b mobile-capacitor

echo ""
echo "✅ Branch 'mobile-capacitor' created successfully."
echo ""
echo "The production branch ($CURRENT) is untouched."
echo "All Capacitor changes will live in 'mobile-capacitor'."
echo ""
echo "Next: run  bash scripts/mobile-setup.sh"
