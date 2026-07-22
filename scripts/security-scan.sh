#!/bin/bash
# ==============================================================================
# Harikson Security Audit Script — Scans for Forbidden Hardcoded Bypass Tokens
# ==============================================================================

echo "🔍 Scanning codebase for forbidden bypass tokens..."

# Search patterns (excluding SECURITY.md, AUDIT_README.md, full_stack_audit.md, implementation_plan.md, and this script)
FOUND_TOKENS=$(grep -rnE "TEST_TOKEN|TEST_ADMIN_TOKEN" \
  --exclude="SECURITY.md" \
  --exclude="AUDIT_README.md" \
  --exclude="full_stack_audit.md" \
  --exclude="implementation_plan.md" \
  --exclude="security-scan.sh" \
  --exclude-dir=".git" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" \
  --exclude-dir="dist" \
  --exclude-dir="build" \
  . 2>/dev/null)

if [ -n "$FOUND_TOKENS" ]; then
  echo ""
  echo "🚨 CRITICAL SECURITY POLICY VIOLATION ENCOUNTERED! 🚨"
  echo "Hardcoded bypass tokens (TEST_TOKEN / TEST_ADMIN_TOKEN) detected in repository:"
  echo "--------------------------------------------------------------------------------"
  echo "$FOUND_TOKENS"
  echo "--------------------------------------------------------------------------------"
  echo "Commit / Build rejected per SECURITY.md policy."
  exit 1
else
  echo "✅ Security scan passed: No hardcoded bypass tokens found."
fi

# Run Migration Number Integrity Check
node "$(dirname "$0")/check-migrations.js"
if [ $? -ne 0 ]; then
  echo "❌ Security scan failed due to migration integrity check."
  exit 1
fi

exit 0
