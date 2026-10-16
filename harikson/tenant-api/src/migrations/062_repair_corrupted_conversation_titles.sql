-- Migration 062: Repair Corrupted Conversation Titles
-- Cleans legacy truncated <uploaded_file> tags and [Attached Image/Document] tags from conversation titles

-- 1. Repair titles for Xarwiz Social Media Growth Strategy
UPDATE conversations
SET title = 'Xarwiz Social Media Growth Strategy', updated_at = updated_at
WHERE title LIKE '<uploaded_file%Xarwiz%' OR title LIKE '<uploaded_file%Growth_Strategy%';

-- 2. Repair titles for airticket document
UPDATE conversations
SET title = 'Airticket Document Analysis', updated_at = updated_at
WHERE title LIKE '<uploaded_file%airticket%';

-- 3. Repair titles for Cab Rental Service Platform
UPDATE conversations
SET title = 'Cab Rental Service Platform', updated_at = updated_at
WHERE title LIKE '<uploaded_file%Cab Renta%';

-- 4. Repair titles for WhatsApp Image / image attachments
UPDATE conversations
SET title = 'Image Analysis', updated_at = updated_at
WHERE title LIKE '<uploaded_file%WhatsApp%' OR title LIKE '[Attached Image%WhatsApp%';

-- 5. Catch-all for any remaining raw attachment or XML strings
UPDATE conversations
SET title = 'Document Analysis', updated_at = updated_at
WHERE (
  title LIKE '<uploaded_file%' OR
  title LIKE '[Attached%' OR
  title LIKE '%<uploaded_%' OR
  title LIKE '%name="%'
) AND title NOT IN (
  'Xarwiz Social Media Growth Strategy',
  'Airticket Document Analysis',
  'Cab Rental Service Platform',
  'Image Analysis'
);
