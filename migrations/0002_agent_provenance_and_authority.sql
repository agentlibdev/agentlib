ALTER TABLE agents ADD COLUMN namespace_type TEXT NOT NULL DEFAULT 'official';
ALTER TABLE agents ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'official';
ALTER TABLE agents ADD COLUMN canonical_namespace TEXT;
ALTER TABLE agents ADD COLUMN canonical_name TEXT;
ALTER TABLE agents ADD COLUMN claimed_by_namespace TEXT;
ALTER TABLE agents ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE agents ADD COLUMN source_url TEXT;
ALTER TABLE agents ADD COLUMN source_repository_url TEXT;
ALTER TABLE agents ADD COLUMN original_author_handle TEXT;
ALTER TABLE agents ADD COLUMN original_author_name TEXT;
ALTER TABLE agents ADD COLUMN original_author_url TEXT;
ALTER TABLE agents ADD COLUMN submitted_by_handle TEXT;
ALTER TABLE agents ADD COLUMN submitted_by_name TEXT;

UPDATE agents
SET canonical_namespace = namespace
WHERE canonical_namespace IS NULL;

UPDATE agents
SET canonical_name = name
WHERE canonical_name IS NULL;

UPDATE agents
SET original_author_handle = namespace
WHERE original_author_handle IS NULL;

UPDATE agents
SET original_author_name = namespace
WHERE original_author_name IS NULL;

UPDATE agents
SET submitted_by_handle = namespace
WHERE submitted_by_handle IS NULL;

UPDATE agents
SET submitted_by_name = namespace
WHERE submitted_by_name IS NULL;
