package com.godotlaunch.backend.entity.enums;

public enum NotificationType {
    PAYMENT_SUCCESS,        // buyer thanh toán thành công → báo buyer
    NEW_SALE,               // người dùng mua sản phẩm → báo seller sở hữu
    GAME_REVIEW_RESULT,     // admin duyệt/từ chối game/asset → báo developer
    CONTRACT_OFFERED,       // admin gửi hợp đồng → báo developer
    SELLER_RESPONSE,        // seller phản hồi (vd: ký/từ chối hợp đồng) → báo admin
    NEW_REVIEW,             // buyer viết review/đánh giá -> báo seller
    REVIEW_REMOVED,         // admin xóa review -> báo tác giả của review
    WITHDRAWAL_REQUEST,     // dev gửi yêu cầu rút tiền -> báo admin
    WITHDRAWAL_RESULT,      // admin duyệt/từ chối/chuyển tiền -> báo dev
    SECURITY_ALERT,         // phát hiện mã độc -> báo dev
    PLAGIARISM_ALERT,       // nghi vấn trùng lặp code -> báo admin
    STORE_PUBLISH_RESULT,   // ứng dụng lên Google Play / từ chối -> báo dev
    NEW_SUBMISSION          // dev tải lên/gửi game hoặc asset mới -> báo admin
}
