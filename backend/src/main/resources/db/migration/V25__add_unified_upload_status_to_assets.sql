-- V24: Add upload_status and upload_error to assets to support unified zip file upload flow in background threads.
ALTER TABLE public.assets ADD COLUMN upload_status VARCHAR(50) DEFAULT 'PENDING_UPLOAD';
ALTER TABLE public.assets ADD COLUMN upload_error TEXT DEFAULT NULL;

COMMENT ON COLUMN public.assets.upload_status IS 'Status of the unified zip file upload processing (PENDING_UPLOAD, PROCESSING, SUCCESS, FAILED)';
COMMENT ON COLUMN public.assets.upload_error IS 'Error detail message if the background upload processing fails';
