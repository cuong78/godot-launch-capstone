package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.TagRequest;
import com.godotlaunch.backend.dto.response.TagResponse;
import java.util.*;

public interface TagService {
    List<TagResponse> getAll();
    List<TagResponse> search(String query, int limit);
    TagResponse create(TagRequest request);
    TagResponse update(UUID id, TagRequest request);
    void delete(UUID id);
}
