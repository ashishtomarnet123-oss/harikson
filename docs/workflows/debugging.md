# Xarwiz Workflow Engine — Real-Time Visual Debugger Reference

## 1. Real-Time Telemetry Stream (SSE)

The visual canvas connects to a Server-Sent Events (SSE) stream for active executions:

```http
GET /api/v1/workflows/:id/executions/:execId/events
```

### Emitted Events:
- `execution.started`: Initial trigger dispatched.
- `node.queued`: Node awaiting upstream dependencies.
- `node.started`: Worker picked up node execution.
- `node.completed`: Node finished with data and millisecond duration.
- `node.failed`: Node threw error; details sent to UI.
- `node.skipped`: Condition evaluated to alternative branch; node bypassed.
- `execution.completed`: Entire DAG finished successfully.
- `execution.failed`: Workflow terminated on unhandled failure.

---

## 2. Canvas Visual Debugging States

In the `@xyflow/react` editor:
- **Running**: Blue pulsing glow on active node card and animated dotted edges.
- **Success**: Emerald green border with execution duration chip (e.g. `245ms`).
- **Failed**: Crimson red border with error tooltip and retry action button.
- **Skipped**: Muted opacity and gray status icon.

---

## 3. Node Inspector & State Inspection

Clicking any executed node in the canvas opens the Inspector Drawer showing:
- Input JSON payload passed to the node.
- Output JSON returned by the node runtime.
- Exact error stack trace if failed.
- Execution timing breakdown (latency, LLM token counts).
