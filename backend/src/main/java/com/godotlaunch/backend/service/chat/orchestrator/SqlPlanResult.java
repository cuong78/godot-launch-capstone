package com.godotlaunch.backend.service.chat.orchestrator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SqlPlanResult {
    private String generatedSql;
    private String targetView;
    private String explanation;
}
