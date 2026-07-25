-- Migration 028: Email Templates and Custom SMTP Configurations

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  available_variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS smtp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL DEFAULT 'resend', -- 'resend' or 'smtp'
  resend_api_key VARCHAR(255),
  smtp_host VARCHAR(255),
  smtp_port INT DEFAULT 587,
  smtp_user VARCHAR(255),
  smtp_pass VARCHAR(255),
  smtp_secure BOOLEAN DEFAULT true,
  from_email VARCHAR(255) DEFAULT 'noreply@neuravolt.cloud',
  from_name VARCHAR(255) DEFAULT 'Neuravolt Cloud',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default templates
INSERT INTO email_templates (template_key, name, subject, body_html, available_variables)
VALUES 
(
  'access_approval',
  'Access Approval Granted',
  'Your Neuravolt Cloud Access Has Been Approved',
  '<div style="font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;"><h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-top: 0;">Access Approved</h2><p>Hi {{name}},</p><p>Your access to Neuravolt Cloud has been approved.</p><p>You can now sign in using the email address and password you used when requesting access.</p><div style="text-align: center; margin: 32px 0;"><a href="{{loginUrl}}" style="display: inline-block; padding: 14px 28px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Sign In to Neuravolt Cloud</a></div><hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" /><p style="font-size: 12px; color: #94a3b8;">Neuravolt Cloud · Sovereign Enterprise AI Platform</p></div>',
  '["{{name}}", "{{email}}", "{{loginUrl}}"]'
),
(
  'welcome',
  'Welcome to Platform',
  'Welcome to Neuravolt AI!',
  '<div style="font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;"><h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-top: 0;">Welcome to Neuravolt!</h2><p>Hello {{name}},</p><p>Thank you for joining Neuravolt Cloud Platform. Your workspace is active and ready to deploy state-of-the-art AI applications.</p><div style="text-align: center; margin: 32px 0;"><a href="{{loginUrl}}" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Open Workspace</a></div><hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" /><p style="font-size: 12px; color: #94a3b8;">Secured by Neuravolt · Sovereign AI Operating System</p></div>',
  '["{{name}}", "{{email}}", "{{loginUrl}}"]'
),
(
  'password_reset',
  'Password Reset Request',
  'Reset your Neuravolt Cloud password',
  '<div style="font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;"><h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-top: 0;">Password Reset Request</h2><p>Hi {{name}},</p><p>We received a request to reset your password for your Neuravolt account.</p><div style="text-align: center; margin: 32px 0;"><a href="{{resetUrl}}" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Reset Password</a></div><p style="font-size: 12px; color: #94a3b8;">If you did not request this, you can safely ignore this email.</p></div>',
  '["{{name}}", "{{email}}", "{{resetUrl}}"]'
)
ON CONFLICT (template_key) DO NOTHING;

-- Seed default SMTP config
INSERT INTO smtp_configs (provider, resend_api_key, from_email, from_name, is_active)
VALUES ('resend', 're_dev_key', 'noreply@neuravolt.cloud', 'Neuravolt Cloud', true)
ON CONFLICT DO NOTHING;
