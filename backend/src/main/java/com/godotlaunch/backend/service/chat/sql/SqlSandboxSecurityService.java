package com.godotlaunch.backend.service.chat.sql;

import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.select.PlainSelect;
import net.sf.jsqlparser.statement.select.Select;
import net.sf.jsqlparser.statement.select.Limit;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;
import net.sf.jsqlparser.expression.operators.conditional.AndExpression;
import net.sf.jsqlparser.util.TablesNamesFinder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class SqlSandboxSecurityService {

    private static final Set<String> ALLOWED_VIEWS = Set.of(
            "v_seller_wallet_balance",
            "v_game_audit_status",
            "v_admin_payout_requests",
            "v_user_purchases",
            "v_game_reviews",
            "v_user_transactions",
            "v_platform_revenue_report"
    );

    // Private personal views requiring user_id isolation for non-admins
    private static final Map<String, String> PRIVATE_VIEW_OWNER_MAP = Map.of(
            "v_seller_wallet_balance", "user_id",
            "v_admin_payout_requests", "user_id",
            "v_user_transactions", "user_id"
    );

    public String validateAndRewriteSql(String rawSql, String userId, String roleName) {
        if (rawSql == null || rawSql.trim().isEmpty()) {
            throw new IllegalArgumentException("Câu lệnh SQL không được để trống");
        }

        try {
            Statement statement = CCJSqlParserUtil.parse(rawSql);

            if (!(statement instanceof Select selectStatement)) {
                throw new SecurityException("Chỉ cho phép thực thi câu lệnh SELECT đọc dữ liệu");
            }

            // 1. Kiểm tra Whitelist Views
            TablesNamesFinder tablesNamesFinder = new TablesNamesFinder();
            List<String> tableList = tablesNamesFinder.getTableList((Statement) selectStatement);

            for (String tableName : tableList) {
                String cleanTableName = tableName.toLowerCase(Locale.ROOT).replace("\"", "").replace("`", "");
                if (!ALLOWED_VIEWS.contains(cleanTableName)) {
                    throw new SecurityException("Bảo mật: Không được phép truy vấn bảng/view '" + tableName + "'");
                }
            }

            PlainSelect plainSelect = (PlainSelect) selectStatement.getSelectBody();
            if (plainSelect == null) {
                throw new SecurityException("Cấu trúc câu lệnh SELECT không hợp lệ");
            }

            // 2. Phân quyền User (Non-Admin): Inject user_id cho các private views
            boolean isAdmin = "admin".equalsIgnoreCase(roleName) || "ROLE_ADMIN".equalsIgnoreCase(roleName);
            if (!isAdmin) {
                for (String tableName : tableList) {
                    String cleanTableName = tableName.toLowerCase(Locale.ROOT).replace("\"", "").replace("`", "");
                    String ownerColumn = PRIVATE_VIEW_OWNER_MAP.get(cleanTableName);

                    if (ownerColumn != null) {
                        Expression userEqExpr = CCJSqlParserUtil.parseCondExpression(cleanTableName + "." + ownerColumn + " = '" + userId + "'");
                        Expression currentWhere = plainSelect.getWhere();

                        if (currentWhere == null) {
                            plainSelect.setWhere(userEqExpr);
                        } else {
                            plainSelect.setWhere(new AndExpression(currentWhere, userEqExpr));
                        }
                    }
                }
            }

            // 3. Ép buộc LIMIT 50
            Limit limit = new Limit();
            limit.setRowCount(new LongValue(50));
            plainSelect.setLimit(limit);

            String sanitizedSql = selectStatement.toString();
            log.info("SQL Sandboxed Execution. User: {}, Role: {}, Original: '{}' -> Sanitized: '{}'", userId, roleName, rawSql, sanitizedSql);
            return sanitizedSql;

        } catch (SecurityException se) {
            log.warn("Cảnh báo vi phạm bảo mật SQL Sandbox bởi user {}: {}", userId, se.getMessage());
            throw se;
        } catch (Exception e) {
            log.error("Lỗi cú pháp SQL Sandbox: {}", e.getMessage());
            throw new IllegalArgumentException("Câu lệnh SQL không hợp lệ: " + e.getMessage());
        }
    }
}
