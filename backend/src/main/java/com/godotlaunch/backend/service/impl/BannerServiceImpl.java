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
import com.godotlaunch.backend.utils.TranslationUtils;
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
    private final HomepageCacheService homepageCacheService;

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
        applyValues(banner, 
            request.getTitle(), request.getTitleVi(), request.getTitleEn(), request.getTitleJa(),
            request.getDescription(), request.getDescriptionVi(), request.getDescriptionEn(), request.getDescriptionJa(),
            request.getImageUrl(), request.getDisplayOrder());
        BannerResponse response = mapToResponse(bannerRepository.save(banner));
        homepageCacheService.evict();
        return response;
    }

    @Override
    @Transactional
    public BannerResponse update(UUID id, UpdateBannerRequest request) {
        Banner banner = findById(id);
        applyValues(banner, 
            request.getTitle(), request.getTitleVi(), request.getTitleEn(), request.getTitleJa(),
            request.getDescription(), request.getDescriptionVi(), request.getDescriptionEn(), request.getDescriptionJa(),
            request.getImageUrl(), request.getDisplayOrder());
        BannerResponse response = mapToResponse(bannerRepository.save(banner));
        homepageCacheService.evict();
        return response;
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Banner banner = findById(id);
        bannerRepository.delete(banner);
        homepageCacheService.evict();
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

    private void applyValues(Banner banner, 
                             String title, String titleVi, String titleEn, String titleJa,
                             String description, String descriptionVi, String descriptionEn, String descriptionJa,
                             String imageUrl, Integer displayOrder) {
        banner.setTitle(title.trim());
        banner.setTitleVi(titleVi != null ? titleVi.trim() : null);
        banner.setTitleEn(titleEn != null ? titleEn.trim() : null);
        banner.setTitleJa(titleJa != null ? titleJa.trim() : null);
        banner.setDescription(description.trim());
        banner.setDescriptionVi(descriptionVi != null ? descriptionVi.trim() : null);
        banner.setDescriptionEn(descriptionEn != null ? descriptionEn.trim() : null);
        banner.setDescriptionJa(descriptionJa != null ? descriptionJa.trim() : null);
        banner.setImageUrl(imageUrl.trim());
        banner.setDisplayOrder(displayOrder);
    }

    private BannerResponse mapToResponse(Banner banner) {
        return TranslationUtils.mapBanner(banner);
    }
}
