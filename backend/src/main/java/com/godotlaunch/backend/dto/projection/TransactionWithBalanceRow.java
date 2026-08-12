package com.godotlaunch.backend.dto.projection;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Interface projection cho native query có window function (SUM() OVER) —
 * dùng để tính "số dư ví SAU giao dịch này" (running balance) tại đúng thời
 * điểm giao dịch xảy ra, không chỉ số dư hiện tại (latest) của cả ví.
 *
 * balanceAfter = tổng cộng dồn amount của TẤT CẢ transaction cùng wallet_id,
 * tính theo thứ tự created_at tăng dần TÍNH ĐẾN VÀ BAO GỒM dòng này — nên
 * balanceAfter của giao dịch mới nhất luôn khớp với Wallet.balance hiện tại
 * (trừ khi có sai lệch dữ liệu, đây không phải phạm vi xử lý ở đây).
 */
public interface TransactionWithBalanceRow {
    UUID getId();
    UUID getWalletId();
    UUID getRelatedUserId();
    String getRelatedUserFullName();
    UUID getGameId();
    String getGameTitle();
    BigDecimal getAmount();
    String getType();
    String getReferenceId();
    Instant getCreatedAt();
    BigDecimal getBalanceAfter();
}
