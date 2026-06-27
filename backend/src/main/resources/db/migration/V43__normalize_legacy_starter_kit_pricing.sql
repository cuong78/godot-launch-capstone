DO $$
DECLARE
    v_target_price NUMERIC(15,2) := 80000.00;
    v_legacy_price NUMERIC(15,2) := 79.99;
BEGIN
    UPDATE marketplace_items mi
    SET price = v_target_price
    FROM users u
    WHERE mi.seller_id = u.id
      AND u.email = 'admin@godotlaunch.com'
      AND mi.title = '2D Platformer Starter Kit'
      AND mi.price = v_legacy_price;

    UPDATE orders o
    SET price_paid = v_target_price
    WHERE o.marketplace_item_id IN (
        SELECT mi.id
        FROM marketplace_items mi
        JOIN users u ON u.id = mi.seller_id
        WHERE u.email = 'admin@godotlaunch.com'
          AND mi.title = '2D Platformer Starter Kit'
    )
      AND o.price_paid = v_legacy_price;

    UPDATE payments p
    SET amount = v_target_price
    WHERE p.order_id IN (
        SELECT o.id
        FROM orders o
        JOIN marketplace_items mi ON mi.id = o.marketplace_item_id
        JOIN users u ON u.id = mi.seller_id
        WHERE u.email = 'admin@godotlaunch.com'
          AND mi.title = '2D Platformer Starter Kit'
    )
      AND p.amount = v_legacy_price;

    WITH affected_transactions AS (
        SELECT
            t.id,
            t.wallet_id,
            (v_target_price - t.net_amount) AS delta
        FROM transactions t
        JOIN orders o ON o.transaction_id = t.id
        JOIN marketplace_items mi ON mi.id = o.marketplace_item_id
        JOIN users u ON u.id = mi.seller_id
        WHERE u.email = 'admin@godotlaunch.com'
          AND mi.title = '2D Platformer Starter Kit'
          AND t.amount = v_legacy_price
          AND t.net_amount = v_legacy_price
    ),
    updated_transactions AS (
        UPDATE transactions t
        SET amount = v_target_price,
            net_amount = v_target_price
        FROM affected_transactions a
        WHERE t.id = a.id
        RETURNING a.wallet_id, a.delta
    )
    UPDATE wallets w
    SET balance = w.balance + delta_by_wallet.total_delta
    FROM (
        SELECT wallet_id, SUM(delta) AS total_delta
        FROM updated_transactions
        GROUP BY wallet_id
    ) AS delta_by_wallet
    WHERE w.id = delta_by_wallet.wallet_id;
END $$;
