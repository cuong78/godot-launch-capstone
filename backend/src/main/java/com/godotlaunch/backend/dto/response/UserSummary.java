package com.godotlaunch.backend.dto.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummary {
    private UUID id;
    private String fullName;
    private String avatarUrl;
}
