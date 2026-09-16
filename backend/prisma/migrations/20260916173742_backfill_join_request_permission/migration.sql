-- Ensure the permission row exists (in case the app-level PERMISSIONS sync
-- hasn't run yet in this environment)
INSERT INTO permissions (id, key, description)
VALUES (gen_random_uuid()::text, 'members:approve-requests', 'Approve or reject public join requests')
ON CONFLICT (key) DO NOTHING;

-- Grant it to every existing role that already has members:invite —
-- matches this permission's placement in DEFAULT_ROLE_TEMPLATES, so
-- existing orgs end up with the same grants a fresh org would get today.
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT rp."roleId", p.id
FROM role_permissions rp
JOIN permissions existing ON existing.id = rp."permissionId" AND existing.key = 'members:invite'
JOIN permissions p ON p.key = 'members:approve-requests'
ON CONFLICT DO NOTHING;