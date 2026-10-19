-- Migration 066: Add SLA response tracking and deadline fields to support_tickets
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS sla_hours INTEGER NULL,
  ADD COLUMN IF NOT EXISTS first_response_due_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS first_responded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS first_responder_id UUID NULL,
  ADD COLUMN IF NOT EXISTS first_response_text TEXT NULL,
  ADD COLUMN IF NOT EXISTS sla_status VARCHAR(50) NOT NULL DEFAULT 'within_sla', -- 'no_sla', 'within_sla', 'breached', 'met'
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_sla ON support_tickets(sla_status, first_response_due_at);
