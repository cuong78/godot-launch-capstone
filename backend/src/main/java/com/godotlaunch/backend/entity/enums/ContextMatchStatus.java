package com.godotlaunch.backend.entity.enums;

/**
 * Kết quả AI đối chiếu code tại 1 commit với mô tả/hình ảnh/video game đã khai báo.
 * Chỉ được chấm lazy khi có dispute — không chấm mọi commit ngay lúc push.
 */
public enum ContextMatchStatus {
    pending,    // chưa được AI chấm (mặc định, đa số commit ở trạng thái này)
    matched,    // code khớp ngữ cảnh game đã khai báo
    mismatched, // code không khớp — dấu hiệu cấy/đạo nhái tại thời điểm này
    inconclusive // không đủ căn cứ kết luận (code quá nhỏ, không phải phần lõi, v.v.)
}
