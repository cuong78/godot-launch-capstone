-- Migration V26: Create 7 Pre-defined Whitelist Views for AI Chatbot SQL Tool Sandbox

-- 1. View: v_seller_wallet_balance (Ví Seller & Số dư có thể rút)
CREATE OR REPLACE VIEW v_seller_wallet_balance AS
SELECT 
    w.user_id::varchar AS user_id,
    w.balance AS total_balance,
    w.withdrawable_balance,
    w.currency,
    u.full_name AS seller_name,
    u.email AS seller_email
FROM wallets w
JOIN users u ON w.user_id = u.id;

-- 2. View: v_game_audit_status (Trạng thái duyệt Game / Asset)
CREATE OR REPLACE VIEW v_game_audit_status AS
SELECT 
    g.id::varchar AS game_id,
    g.creator_id::varchar AS owner_id,
    g.title AS game_title,
    g.status::varchar AS audit_status,
    g.price_proposed AS price,
    g.created_at,
    g.updated_at
FROM games g;

-- 3. View: v_admin_payout_requests (Lệnh rút tiền cho Admin & Seller)
CREATE OR REPLACE VIEW v_admin_payout_requests AS
SELECT 
    wr.id::varchar AS request_id,
    wr.user_id::varchar AS user_id,
    wr.amount,
    wr.status::varchar AS payout_status,
    u.bank_name,
    u.bank_account AS account_number,
    wr.created_at,
    wr.processed_at
FROM withdrawal_requests wr
JOIN users u ON wr.user_id = u.id;

-- 4. View: v_user_purchases (Lịch sử mua hàng của Buyer)
CREATE OR REPLACE VIEW v_user_purchases AS
SELECT 
    o.id::varchar AS order_id,
    o.buyer_id::varchar AS buyer_id,
    o.game_id::varchar AS game_id,
    g.title AS game_title,
    g.creator_id::varchar AS owner_id,
    o.price_paid AS total_amount,
    o.order_type::varchar AS order_status,
    o.purchased_at AS purchase_date
FROM orders o
LEFT JOIN games g ON o.game_id = g.id;

-- 5. View: v_game_reviews (Đánh giá sản phẩm)
CREATE OR REPLACE VIEW v_game_reviews AS
SELECT 
    r.id::varchar AS review_id,
    r.game_id::varchar AS game_id,
    r.user_id::varchar AS reviewer_id,
    r.rating,
    r.comment,
    r.created_at
FROM reviews r;

-- 6. View: v_user_transactions (Lịch sử giao dịch ví)
CREATE OR REPLACE VIEW v_user_transactions AS
SELECT 
    t.id::varchar AS transaction_id,
    w.user_id::varchar AS user_id,
    t.amount,
    t.type::varchar AS transaction_type,
    t.created_at
FROM transactions t
JOIN wallets w ON t.wallet_id = w.id;

-- 7. View: v_platform_revenue_report (Báo cáo doanh thu cho Admin)
CREATE OR REPLACE VIEW v_platform_revenue_report AS
SELECT 
    t.id::varchar AS transaction_id,
    t.amount AS revenue_amount,
    t.type::varchar AS transaction_type,
    t.created_at AS revenue_date
FROM transactions t
WHERE t.type = 'commission' OR t.type = 'revenue_share';
