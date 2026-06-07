package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SharePostRequest {

    @Size(max = 2000, message = "Message must not exceed 2000 characters.")
    private String message;
}
