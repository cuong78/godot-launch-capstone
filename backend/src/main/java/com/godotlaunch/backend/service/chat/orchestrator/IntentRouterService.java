package com.godotlaunch.backend.service.chat.orchestrator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntentRouterService {

    private final ChatModel chatModel;

    public IntentResult classifyIntent(String userQuery, String roleName) {
        BeanOutputConverter<IntentResult> converter = new BeanOutputConverter<>(IntentResult.class);

        String prompt = """
                Bạn là một Intent Classifier chuyên nghiệp cho hệ thống Godot Launch Capstone.
                Hãy phân tích câu hỏi của người dùng có vai trò [%s] và phân loại vào 1 trong các Intent:
                1. KNOWLEDGE_RAG: Hỏi đáp về quy trình, hướng dẫn, luật lệ hệ thống (KYC, đăng game, nạp tiền PayOS, hợp đồng CH Play...).
                2. SQL_DATA_QUERY: Tra cứu dữ liệu số dư ví, danh sách game, đơn hàng, doanh thu, lịch sử giao dịch.
                3. PLAGIARISM_REPORT: Hỏi về kết quả kiểm tra đạo văn code, tỷ lệ trùng lặp AST MinHash của game.
                4. HYBRID: Kết hợp hoặc không chắc chắn (Confidence < 0.70).

                Phản hồi của bạn PHẢI tuân theo đúng định dạng JSON sau:
                %s

                Câu hỏi của người dùng: %s
                """.formatted(roleName, converter.getFormat(), userQuery);

        try {
            String rawResponse = chatModel.call(prompt);
            IntentResult result = converter.convert(rawResponse);

            if (result != null && result.getConfidenceScore() != null && result.getConfidenceScore() < 0.70) {
                log.info("Confidence score ({}) < 0.70, chuyển fallback intent về HYBRID", result.getConfidenceScore());
                result.setIntentType(IntentType.HYBRID);
            }

            return result != null ? result : defaultHybridResult();

        } catch (Exception e) {
            log.warn("Lỗi khi phân loại Intent bằng BeanOutputConverter: {}. Sử dụng fallback HYBRID.", e.getMessage());
            return defaultHybridResult();
        }
    }

    private IntentResult defaultHybridResult() {
        return IntentResult.builder()
                .intentType(IntentType.HYBRID)
                .confidenceScore(0.50)
                .reasoning("Fallback do không đủ tin cậy hoặc lỗi phân tích cú pháp.")
                .build();
    }
}
