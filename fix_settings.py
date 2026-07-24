#!/usr/bin/env python3
"""Fix all settings components to use authenticatedFetch and getApiConfig properly."""
import re
import os

SETTINGS_DIR = "/Users/ashishpratapsinghtomar/Downloads/files/user-portal/components/settings"
FILES = ["workspace.js", "profile.js", "activity.js", "devices.js", "developer.js",
         "billing.js", "security.js", "usage.js", "appearance.js", "language.js"]

IMPORT_LINE = "import { authenticatedFetch, getApiConfig } from './apiHelper';\n"

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # 1. Remove any duplicate imports of authenticatedFetch
    count = content.count(IMPORT_LINE)
    if count > 1:
        content = content.replace(IMPORT_LINE, '', count - 1)

    # 2. Ensure import exists at top (add if missing)
    if IMPORT_LINE.strip() not in content:
        content = IMPORT_LINE + content

    # 3. Fix broken apiBase patterns that remain (various formats)
    # Pattern: const apiBase = \n          localStorage... || \n          process.env... || \n          'http://localhost:3008';
    patterns_to_replace = [
        # Multi-line with process.env
        (r"const apiBase\s*=\s*\n?\s*(?:localStorage\.getItem\('hk_api_base'\)\s*\|\|\s*\n?\s*)?process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*\n?\s*'http://localhost:3008';\s*\n?\s*// tenantSlug from getApiConfig above",
         "const { apiBase, tenantSlug } = getApiConfig();"),
        # Multi-line without process.env
        (r"const apiBase\s*=\s*\n?\s*(?:\(typeof window !== 'undefined' && )?localStorage\.getItem\('hk_api_base'\)\)?[^;]*;\s*\n?\s*const tenantSlug\s*=\s*\n?\s*(?:\(typeof window !== 'undefined' && )?localStorage\.getItem\('hk_tenant'\)\)?[^;]*;",
         "const { apiBase, tenantSlug } = getApiConfig();"),
        # Remaining single-line with process.env
        (r"const apiBase\s*=\s*\(typeof window !== 'undefined' && localStorage\.getItem\('hk_api_base'\)\)[^;]*;\s*\n?\s*const tenantSlug\s*=[^;]*;",
         "const { apiBase, tenantSlug } = getApiConfig();"),
        # Comment artifact // tenantSlug from getApiConfig above
        (r"\s*// tenantSlug from getApiConfig above", ""),
    ]

    for pattern, replacement in patterns_to_replace:
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    # 4. Remove leftover "const { apiBase, tenantSlug } = getApiConfig();" duplicates
    # (keep only the first occurrence per function context is hard, so just remove consecutive duplicates)
    content = re.sub(r'(const \{ apiBase, tenantSlug \} = getApiConfig\(\);\n)(\s*const \{ apiBase, tenantSlug \} = getApiConfig\(\);\n)+', r'\1', content)

    # 5. Replace raw fetch calls that still use apiBase (authenticatedFetch already handles tenant header)
    # Remove x-tenant-slug from authenticatedFetch options since apiHelper injects it automatically
    # Replace: credentials: 'include', ... 'x-tenant-slug': tenantSlug, with just the other headers
    # This is a soft fix - leave tenantSlug in for now, it won't hurt

    # 6. Fix cases where tenantSlug variable is referenced but apiBase is computed inline
    # These are profile.js leftover patterns
    content = re.sub(
        r"const apiBase\s*=\s*\n?\s*localStorage\.getItem\('hk_api_base'\)\s*\|\|\s*\n?\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*\n?\s*'http://localhost:3008';",
        "const { apiBase, tenantSlug } = getApiConfig();",
        content, flags=re.DOTALL
    )
    content = re.sub(
        r"const apiBase\s*=\s*localStorage\.getItem\('hk_api_base'\)\s*\|\|\s*\n?\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*\n?\s*'http://localhost:3008';",
        "const { apiBase, tenantSlug } = getApiConfig();",
        content, flags=re.DOTALL
    )

    # Remove stray standalone tenantSlug lines that follow apiBase
    content = re.sub(
        r"\n\s*// tenantSlug from getApiConfig above\n",
        "\n",
        content
    )
    content = re.sub(
        r"const tenantSlug\s*=\s*\n?\s*(?:\(typeof window !== 'undefined' && )?localStorage\.getItem\('hk_tenant'\)\)?[^;]*;",
        "// tenantSlug from getApiConfig",
        content
    )

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed: {os.path.basename(filepath)}")
    else:
        print(f"No changes: {os.path.basename(filepath)}")

for fname in FILES:
    fix_file(os.path.join(SETTINGS_DIR, fname))

print("\nDone!")
