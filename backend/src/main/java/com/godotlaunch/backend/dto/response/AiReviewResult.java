package com.godotlaunch.backend.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Kết quả Python /ai/review trả về — report ĐỀ XUẤT cho admin.
 * Điểm có thể null (module bị skip: không có ảnh, DeepSeek chưa cấu hình, lỗi...).
 */
@Getter
@Setter
public class AiReviewResult {
    private Integer codeQualityScore;
    private Integer mediaMatchScore;
    private Integer descriptionMatchScore;
    private boolean nsfwFlag;
    private String overallRecommendation;          // approve | review | reject
    private BigDecimal suggestedPrice;             // giá AI gợi ý (USD)
    private Integer suggestedRevenueSplit;         // % chia doanh thu 0-100
    private String pricingRationale;               // lý do giá
    private List<Map<String, Object>> flags;       // [{type, severity, detail, evidenceIndex?}]
    private Map<String, Object> raw;               // output thô từng module
}
