-- Thêm ràng buộc UNIQUE cho cột transaction_id trong bảng withdrawal_requests để đảm bảo quan hệ 1-1
ALTER TABLE withdrawal_requests
ADD CONSTRAINT uq_withdrawal_requests_transaction UNIQUE (transaction_id);
