package com.godotlaunch.backend.dto.chat;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequest {

    private String sessionId;

    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    @JsonAlias({"prompt", "content", "query"})
    private String message;
}
