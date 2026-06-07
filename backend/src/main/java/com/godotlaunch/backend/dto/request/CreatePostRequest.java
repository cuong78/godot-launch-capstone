package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreatePostRequest {

    @NotBlank(message = "Message cannot be blank.")
    @Size(max = 2000, message = "Message must not exceed 2000 characters.")
    private String message;

    private UUID gameId;

    private List<String> mediaUrls;
}
