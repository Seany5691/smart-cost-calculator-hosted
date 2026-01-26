-- Diagnostic queries to understand lead movement issue

-- 1. Check all leads and their current status
SELECT 
  id,
  name,
  status,
  created_at,
  updated_at
FROM leads
ORDER BY name;

-- 2. Check if there are any duplicate leads
SELECT 
  name,
  COUNT(*) as count
FROM leads
GROUP BY name
HAVING COUNT(*) > 1;

-- 3. Check recent status changes in interactions table
SELECT 
  i.created_at,
  l.name as lead_name,
  i.interaction_type,
  i.old_value as old_status,
  i.new_value as new_status
FROM interactions i
JOIN leads l ON i.lead_id = l.id
WHERE i.interaction_type = 'status_change'
ORDER BY i.created_at DESC
LIMIT 20;

-- 4. Check if notes/reminders/attachments are properly linked
SELECT 
  l.name as lead_name,
  l.status,
  COUNT(DISTINCT n.id) as note_count,
  COUNT(DISTINCT r.id) as reminder_count,
  COUNT(DISTINCT a.id) as attachment_count
FROM leads l
LEFT JOIN notes n ON l.id = n.lead_id
LEFT JOIN reminders r ON l.id = r.lead_id
LEFT JOIN attachments a ON l.id = a.lead_id
GROUP BY l.id, l.name, l.status
ORDER BY l.name;
