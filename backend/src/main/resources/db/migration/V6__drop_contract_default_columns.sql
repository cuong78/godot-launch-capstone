-- Bỏ các cột "hằng số platform" khỏi contracts.
-- Nguyên tắc: cái gì giống nhau ở mọi hợp đồng thì thuộc về TEMPLATE PDF, không lưu từng row.
-- - dispute_resolution_clause, additional_terms: điều khoản chuẩn nằm trong template (policy cố định, không đàm phán chữ).
-- - buyer_representative, buyer_position: hệ thống chỉ có 1 admin — hằng số của template.
-- - buyer_signature_base64: chữ ký admin là asset cố định, tự đóng dấu khi sinh PDF.
-- - signed_at_buyer: admin ký ngay lúc tạo offer => trùng created_at.
ALTER TABLE public.contracts
    DROP COLUMN IF EXISTS dispute_resolution_clause,
    DROP COLUMN IF EXISTS additional_terms,
    DROP COLUMN IF EXISTS buyer_representative,
    DROP COLUMN IF EXISTS buyer_position,
    DROP COLUMN IF EXISTS buyer_signature_base64,
    DROP COLUMN IF EXISTS signed_at_buyer;
