package com.godotlaunch.backend.service.chat.orchestrator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IntentResult {
    private IntentType intentType;
    private Double confidenceScore;
    private String reasoning;
    private String extractedGameId;
}
