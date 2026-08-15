-- ADD AGREEMENT_TYPE TO AGREEMENT_VERSIONS
ALTER TABLE public.agreement_versions 
ADD COLUMN agreement_type varchar(50) NOT NULL DEFAULT 'DEVELOPER_ONBOARDING';

-- Drop the old unique active constraint index
DROP INDEX IF EXISTS public.uq_agreement_versions_active;

-- Create a new conditional unique index to allow one active version per agreement type
CREATE UNIQUE INDEX uq_agreement_versions_active
    ON public.agreement_versions (agreement_type, is_active)
    WHERE is_active = true;
