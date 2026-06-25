-- Dev-only reset for face verification data.
-- Do not move this file into src/main/resources/db/migration.
-- This script resets local database state so users can scan face again.

BEGIN;

-- Remove all stored face embeddings.
DELETE FROM face_embeddings;

-- Allow every user to verify face again.
UPDATE users
SET face_verified = FALSE
WHERE face_verified = TRUE;

-- Clear face-based blacklist vectors but keep other ban metadata intact.
UPDATE banned_identities
SET face_embedding = NULL
WHERE face_embedding IS NOT NULL;

COMMIT;

-- Optional checks after running:
-- SELECT COUNT(*) AS face_embeddings_left FROM face_embeddings;
-- SELECT COUNT(*) AS verified_users_left FROM users WHERE face_verified = TRUE;
-- SELECT COUNT(*) AS banned_faces_left FROM banned_identities WHERE face_embedding IS NOT NULL;
