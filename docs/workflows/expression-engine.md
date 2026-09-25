# Xarwiz Workflow Engine — Expression Engine Reference

## 1. Syntax & Resolution

The Xarwiz Expression Engine enables dynamic string and value interpolation using `{{ ... }}` syntax.

### Supported Context Namespaces:
- `{{$trigger.body.field}}`: Inbound webhook body or manual trigger parameters.
- `{{$trigger.headers.headerName}}`: Inbound HTTP headers.
- `{{$trigger.query.paramName}}`: Inbound HTTP query parameters.
- `{{$node["node_id"].output.field}}` or `{{$node.step_name.output.field}}`: Output from preceding execution steps.
- `{{$variables.customVar}}`: Workflow environment variables.
- `{{$execution.id}}`: Current execution run UUID.
- `{{$workflow.id}}`: Parent workflow ID.
- `{{$now}}`: Current ISO 8601 UTC timestamp.
- `{{$today}}`: Current date (`YYYY-MM-DD`).

---

## 2. Security & Anti-Exploit Protections

The engine executes in a hardened sandbox preventing prototype pollution and environment leaks:

### 1. Prototype Pollution Prevention:
Any path attempting to access:
- `__proto__`
- `constructor`
- `prototype`
is blocked and resolves safely to `undefined`.

### 2. Process & Global Isolation:
The sandbox disallows:
- `process`
- `require`
- `eval`
- `Function`
- `global` / `globalThis`

### 3. Safe Path Traversal:
Nested property access handles missing objects gracefully without throwing `TypeError: Cannot read properties of undefined`.
