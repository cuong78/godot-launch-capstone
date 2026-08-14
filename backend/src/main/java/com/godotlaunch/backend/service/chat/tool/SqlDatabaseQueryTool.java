package com.godotlaunch.backend.service.chat.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.service.chat.sql.SqlSandboxSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class SqlDatabaseQueryTool {

    private final JdbcTemplate jdbcTemplate;
    private final SqlSandboxSecurityService securityService;
    private final ObjectMapper objectMapper;

    public String executeQuery(String rawSql, String userId, String roleName) {
        try {
            String sanitizedSql = securityService.validateAndRewriteSql(rawSql, userId, roleName);
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sanitizedSql);
            return objectMapper.writeValueAsString(rows);
        } catch (Exception e) {
            log.error("Lỗi khi thực thi SQL Tool Sandbox: {}", e.getMessage());
            return "{\"error\": \"" + e.getMessage().replace("\"", "'") + "\"}";
        }
    }
}
