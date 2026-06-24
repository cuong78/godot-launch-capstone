package com.godotlaunch.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties(prefix = "app.security.oauth.github")
@Component
@Getter
@Setter
public class GitHubOAuthConfig {
    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private String botUsername;   // machine user account, vd "godotlaunch-bot"
    private String botToken;      // PAT của bot — clone private repo developer mời
}
