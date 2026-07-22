# Security Policy

## Hardcoded Token & Backdoor Prohibition Policy

> [!CAUTION]
> **STRICT BAN ON HARDCODED TOKENS AND BYPASS CREDENTIALS**
> Under no circumstances may hardcoded bypass tokens (such as `TEST_TOKEN`, `TEST_ADMIN_TOKEN`, or mock UUID fallbacks) be committed into the repository or deployed to any environment.

### Policy Rules

1. **Authentication Enforcement:**
   - All authentication logic must validate cryptographically signed JWT tokens or hashed database credentials.
   - Fallback bypass logic, master bypass tokens, and mock user auto-provisioning routines are strictly forbidden.

2. **Automated Security Guardrails:**
   - A pre-commit hook runs locally on every commit to scan for forbidden bypass patterns (`TEST_TOKEN`, `TEST_ADMIN_TOKEN`).
   - GitHub Actions CI scans every pull request and build for forbidden security bypass patterns. Commits containing bypass strings will fail the build automatically.

3. **Credential & Secret Management:**
   - All secrets (`JWT_SECRET`, `TENANT_MASTER_KEY`, `PAYMENT_ENCRYPTION_KEY`, database credentials, third-party API keys) must be injected exclusively via environment variables or secret vaults.
   - `PAYMENT_ENCRYPTION_KEY` encrypts Stripe and Razorpay merchant credentials at rest (AES-256-GCM). It must be at least 32 characters long. The application will fail to boot if it is missing or weak.
   - Code fallbacks to hardcoded default strings in production-facing services are strictly prohibited.

4. **Reporting Security Vulnerabilities:**
   - If you discover a potential security vulnerability, please report it immediately to security@neuravolt.cloud.
