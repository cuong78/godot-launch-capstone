package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.*;
import com.godotlaunch.backend.dto.response.HomepageSectionResponse;
import java.util.*;

public interface HomepageSectionService {
    List<HomepageSectionResponse> getAll();
    HomepageSectionResponse create(HomepageSectionRequest request);
    HomepageSectionResponse update(UUID id, UpdateHomepageSectionRequest request);
    void delete(UUID id);
}
