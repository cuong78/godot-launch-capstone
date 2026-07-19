package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateBannerRequest;
import com.godotlaunch.backend.dto.request.UpdateBannerRequest;
import com.godotlaunch.backend.dto.response.BannerResponse;
import com.godotlaunch.backend.entity.Banner;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.BannerRepository;
import com.godotlaunch.backend.service.BannerService;
import com.godotlaunch.backend.service.SeaweedFsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BannerServiceImpl implements BannerService {

    private static final long MAX_IMAGE_SIZE = 10L * 1024L * 1024L;

    private final BannerRepository bannerRepository;
    private final SeaweedFsService seaweedFsService;

    @Override
    @Transactional(readOnly = true)
    public List<BannerResponse> getAll() {
        return bannerRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public BannerResponse create(CreateBannerRequest request) {
        Banner banner = new Banner();
        applyValues(banner, request.getTitle(), request.getDescription(), request.getImageUrl(), request.getDisplayOrder());
        return mapToResponse(bannerRepository.save(banner));
    }

    @Override
    @Transactional
    public BannerResponse update(UUID id, UpdateBannerRequest request) {
        Banner banner = findById(id);
        applyValues(banner, request.getTitle(), request.getDescription(), request.getImageUrl(), request.getDisplayOrder());
        return mapToResponse(bannerRepository.save(banner));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Banner banner = findById(id);
        bannerRepository.delete(banner);
    }

    @Override
    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Banner image is required.");
        }
        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType) || !contentType.startsWith("image/")) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Banner file must be an image.");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new AppException(ErrorCode.MEDIA_FILE_TOO_LARGE, "Banner image must not exceed 10 MB.");
        }
        return seaweedFsService.uploadFile(file, "banners");
    }

    private Banner findById(UUID id) {
        return bannerRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BANNER_NOT_FOUND));
    }

    private void applyValues(Banner banner, String title, String description, String imageUrl, Integer displayOrder) {
        banner.setTitle(title.trim());
        banner.setDescription(description.trim());
        banner.setImageUrl(imageUrl.trim());
        banner.setDisplayOrder(displayOrder);
    }

    private BannerResponse mapToResponse(Banner banner) {
        return BannerResponse.builder()
                .id(banner.getId())
                .title(banner.getTitle())
                .description(banner.getDescription())
                .imageUrl(banner.getImageUrl())
                .displayOrder(banner.getDisplayOrder())
                .createdAt(banner.getCreatedAt())
                .updatedAt(banner.getUpdatedAt())
                .build();
    }
}
