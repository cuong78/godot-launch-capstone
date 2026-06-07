package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {

    @NotBlank(message = "Message cannot be blank.")
    @Size(max = 2000, message = "Message must not exceed 2000 characters.")
    private String message;

    private List<String> mediaUrls;
}
