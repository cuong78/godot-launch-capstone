package com.godotlaunch.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubLoginResponse {
    private String accessToken;
    private String tokenType;
    private UserSummary user;

    @JsonProperty("isNewUser")
    private boolean isNewUser;
}
