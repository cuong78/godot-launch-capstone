package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.ContentCollectionRequest;
import com.godotlaunch.backend.dto.response.ContentCollectionResponse;
import java.util.*;

public interface ContentCollectionService {
    List<ContentCollectionResponse> getAll();
    ContentCollectionResponse create(ContentCollectionRequest request);
    ContentCollectionResponse update(UUID id, ContentCollectionRequest request);
    void delete(UUID id);
}
