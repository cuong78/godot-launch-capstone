package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.PublishingGuideRequest;
import com.godotlaunch.backend.dto.response.PublishingGuideResponse;

import java.util.List;
import java.util.UUID;

public interface PublishingGuideService {
    
    List<PublishingGuideResponse> getAllGuides();
    
    List<PublishingGuideResponse> getActiveGuides();
    
    PublishingGuideResponse getGuideById(UUID id);
    
    PublishingGuideResponse createGuide(PublishingGuideRequest request, String email);
    
    PublishingGuideResponse updateGuide(UUID id, PublishingGuideRequest request);
    
    void deleteGuide(UUID id);
}
