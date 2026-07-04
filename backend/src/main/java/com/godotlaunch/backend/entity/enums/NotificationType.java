package com.godotlaunch.backend.entity.enums;

public enum NotificationType {
    PAYMENT_SUCCESS,        // buyer thanh toán thành công → báo buyer + seller + admin
    GAME_REVIEW_RESULT,     // admin duyệt/từ chối game → báo developer
    CONTRACT_OFFERED,       // admin gửi hợp đồng → báo developer
    SELLER_RESPONSE,        // seller phản hồi (vd: ký/từ chối hợp đồng) → báo admin
}
