package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreateBannerRequest;
import com.godotlaunch.backend.dto.request.UpdateBannerRequest;
import com.godotlaunch.backend.dto.response.BannerResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface BannerService {
    List<BannerResponse> getAll();
    BannerResponse create(CreateBannerRequest request);
    BannerResponse update(UUID id, UpdateBannerRequest request);
    void delete(UUID id);
    String uploadImage(MultipartFile file);
}
