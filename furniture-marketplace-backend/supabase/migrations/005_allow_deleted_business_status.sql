ALTER TABLE businesses
    DROP CONSTRAINT IF EXISTS businesses_status_check;

ALTER TABLE businesses
    ADD CONSTRAINT businesses_status_check
    CHECK (status IN ('pending', 'verified', 'suspended', 'rejected', 'deleted'));
