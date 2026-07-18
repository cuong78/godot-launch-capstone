-- Bank co dinh cua developer, cung cap bat buoc khi confirm KYC (become
-- developer). Dung lam nguon rut tien on dinh (thay the nhap tay tung lan
-- rut nhu withdrawal_requests hien tai - viec doi flow rut tien de sau) va
-- lam nguon copy sang banned_identities khi user bi ban.

ALTER TABLE public.users
    ADD COLUMN bank_name character varying(200),
    ADD COLUMN bank_account character varying(100),
    ADD COLUMN bank_account_holder character varying(200);
