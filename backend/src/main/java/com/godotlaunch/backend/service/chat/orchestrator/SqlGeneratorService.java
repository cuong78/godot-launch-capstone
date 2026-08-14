package com.godotlaunch.backend.service.chat.orchestrator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SqlGeneratorService {

    private final ChatModel chatModel;

    public SqlPlanResult generateSqlPlan(String userQuery, String roleName) {
        BeanOutputConverter<SqlPlanResult> converter = new BeanOutputConverter<>(SqlPlanResult.class);

        String prompt = """
                Bạn là một SQL Expert. Hãy viết 1 câu lệnh SQL SELECT đơn giản để trả lời câu hỏi của người dùng có vai trò [%s].
                BẮT BUỘC CHỈ DÙNG 1 TRONG CÁC VIEWS SAU:
                - v_seller_wallet_balance (user_id, total_balance, withdrawable_balance, currency, seller_name, seller_email)
                - v_game_audit_status (game_id, owner_id, game_title, audit_status, price, created_at, updated_at)
                - v_admin_payout_requests (request_id, user_id, amount, payout_status, bank_name, account_number, created_at, processed_at)
                - v_user_purchases (order_id, buyer_id, game_id, game_title, owner_id, total_amount, order_status, purchase_date)
                - v_game_reviews (review_id, game_id, reviewer_id, rating, comment, created_at)
                - v_user_transactions (transaction_id, user_id, amount, transaction_type, created_at)
                - v_platform_revenue_report (transaction_id, revenue_amount, transaction_type, revenue_date)

                Mẫu SQL tham khảo:
                - Tựa game bán chạy / nhiều lượt mua nhất: SELECT game_title, COUNT(*) as total_orders, SUM(total_amount) as total_revenue FROM v_user_purchases WHERE game_title IS NOT NULL GROUP BY game_title ORDER BY total_orders DESC LIMIT 5
                - Số dư ví: SELECT total_balance, withdrawable_balance, currency FROM v_seller_wallet_balance
                - Danh sách game mới nhất hoặc trạng thái game: SELECT game_title, price, audit_status, created_at FROM v_game_audit_status ORDER BY created_at DESC LIMIT 5
                - Đánh giá sản phẩm: SELECT rating, comment, created_at FROM v_game_reviews ORDER BY created_at DESC LIMIT 5

                Phản hồi của bạn PHẢI tuân theo đúng định dạng JSON sau:
                %s

                Câu hỏi của người dùng: %s
                """.formatted(roleName, converter.getFormat(), userQuery);

        try {
            String rawResponse = chatModel.call(prompt);
            return converter.convert(rawResponse);
        } catch (Exception e) {
            log.error("Lỗi khi sinh SQL Plan bằng BeanOutputConverter: {}", e.getMessage());
            return null;
        }
    }
}
