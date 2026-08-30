package com.godotlaunch.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GooglePlayMockConfigDto {
    @Builder.Default
    private String provider = "GOOGLE_PLAY_MOCK";
    private String bucketUri;
    private String serviceAccountEmail;
    private String dailySyncTime;
    @Builder.Default
    private Boolean enabled = true;
}
