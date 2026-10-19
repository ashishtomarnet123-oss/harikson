-- Migration 069: Update Registered Office Address across privacy notices and system records
UPDATE privacy_notices
SET content_json = jsonb_set(
    content_json,
    '{address}',
    '"House No 2, Sai Dham Colony, DD Nagar, Gwalior, Madhya Pradesh - 474005, India"'
)
WHERE version = '2.0-dpdp';
