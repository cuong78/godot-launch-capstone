package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.HomepageResponse;

public interface HomepageService {
    HomepageResponse getHomepage();
    void invalidateCache();
}
