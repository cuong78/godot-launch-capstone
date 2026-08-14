-- V26: Add upload_status and upload_error columns to games table to support unified zip file upload background processing.
ALTER TABLE public.games ADD COLUMN upload_status VARCHAR(50) DEFAULT 'PENDING_UPLOAD' NOT NULL;
ALTER TABLE public.games ADD COLUMN upload_error TEXT DEFAULT NULL;

COMMENT ON COLUMN public.games.upload_status IS 'Status of the unified zip file upload processing (PENDING_UPLOAD, PROCESSING, SUCCESS, FAILED)';
COMMENT ON COLUMN public.games.upload_error IS 'Error detail message if the background upload processing fails';
