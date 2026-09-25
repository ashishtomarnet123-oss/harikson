# Xarwiz Workflow Engine — Scheduling System Reference

## 1. Cron Trigger Architecture

Workflows with a Cron Trigger (`trigger.cron`) schedule durable recurring jobs managed through BullMQ repeat options:

```typescript
const jobOptions = {
  repeat: {
    pattern: cronExpression, // Standard 5-field cron syntax
    tz: timezone || 'UTC',   // Timezone specification
  },
};
```

---

## 2. Managing Active Schedules

When a workflow is marked `status = 'active'`:
1. The scheduler creates a repeat job in BullMQ queue `workflow-queue`.
2. The job payload retains `workflowId`, `tenantId`, and `triggerType = 'cron'`.
3. If the workflow is `paused` or `archived`, the repeat job is cleanly removed from BullMQ.

---

## 3. Execution History & Next Run Calculation

- Next scheduled run timestamp is calculated via `cron-parser` and exposed in `workflow.metadata.nextRunAt`.
- Executions triggered by cron include `trigger_type: 'cron'` in `workflow_executions`.
