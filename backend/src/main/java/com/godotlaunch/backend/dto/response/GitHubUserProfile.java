package com.godotlaunch.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubUserProfile {
    private String id;
    private String login;
    private String email;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    private String name;
}
