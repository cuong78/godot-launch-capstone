package com.godotlaunch.backend.exception;

import com.godotlaunch.backend.constant.ErrorCode;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Số dư ví không đủ để mua sản phẩm — mang theo số tiền còn thiếu (shortfall)
 * để frontend hiển thị chính xác cần nạp thêm bao nhiêu.
 */
@Getter
public class InsufficientBalanceException extends AppException {
    private final BigDecimal shortfall;

    public InsufficientBalanceException(BigDecimal shortfall) {
        super(ErrorCode.INSUFFICIENT_BALANCE);
        this.shortfall = shortfall;
    }
}
