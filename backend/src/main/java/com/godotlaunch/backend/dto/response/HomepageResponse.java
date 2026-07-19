package com.godotlaunch.backend.dto.response;

import lombok.*;
import java.util.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class HomepageResponse {
    private List<BannerResponse> banners;
    private List<HomepageSectionResponse> sections;
}
