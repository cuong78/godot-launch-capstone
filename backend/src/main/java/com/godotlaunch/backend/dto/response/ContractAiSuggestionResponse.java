package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.ContractType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Gợi ý của Trợ lý AI cho loại hợp đồng + giá/% phù hợp với 1 game trước khi
 * admin soạn hợp đồng phát hành. Chỉ mang tính tham khảo — admin luôn xem
 * lại và có thể sửa trước khi gửi (không tự động áp dụng).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractAiSuggestionResponse {
    private ContractType suggestedContractType;
    /** Chỉ có giá trị khi suggestedContractType = full_acquisition. */
    private BigDecimal suggestedLumpSumAmount;
    /** % doanh thu Developer nhận — chỉ có giá trị khi suggestedContractType = co_publishing. */
    private Short suggestedRevenueSplit;
    /** Giải thích ngắn gọn lý do AI đề xuất mức trên, hiển thị cho admin tham khảo. */
    private String reasoning;
    /** true nếu gọi AI thất bại (thiếu key, lỗi mạng...) — reasoning khi đó chứa thông báo lỗi. */
    private boolean unavailable;
}
