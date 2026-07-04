-- SourceSnapshot.java đã bỏ các field dư/không dùng:
-- - submitted_by: trùng game.creator (1 game chỉ 1 creator, không có luồng submit hộ).
-- - repo_url: trùng game.github_repo_url tại thời điểm submit.
-- - commit_sha, file_count, file_hashes: không nơi nào đọc lại, chỉ ghi.
ALTER TABLE public.source_snapshots
    DROP COLUMN IF EXISTS submitted_by,
    DROP COLUMN IF EXISTS repo_url,
    DROP COLUMN IF EXISTS commit_sha,
    DROP COLUMN IF EXISTS file_count,
    DROP COLUMN IF EXISTS file_hashes;
