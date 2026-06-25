UPDATE payments
SET payment_status = 'PROCESSING'
WHERE payment_status::text = 'WAITING_VERIFICATION';

UPDATE payments
SET payment_status = 'FAILED'
WHERE payment_status::text = 'REJECTED';
