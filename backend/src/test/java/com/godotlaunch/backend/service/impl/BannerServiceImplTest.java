package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateBannerRequest;
import com.godotlaunch.backend.dto.request.UpdateBannerRequest;
import com.godotlaunch.backend.dto.response.BannerResponse;
import com.godotlaunch.backend.entity.Banner;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.BannerRepository;
import com.godotlaunch.backend.service.SeaweedFsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BannerServiceImplTest {

    @Mock
    private BannerRepository bannerRepository;
    @Mock
    private SeaweedFsService seaweedFsService;
    @Mock
    private HomepageCacheService homepageCacheService;

    @InjectMocks
    private BannerServiceImpl service;

    private Banner banner;
    private UUID bannerId;

    @BeforeEach
    void setUp() {
        bannerId = UUID.randomUUID();
        banner = new Banner();
        banner.setId(bannerId);
        banner.setTitle("Title");
        banner.setDescription("Desc");
        banner.setImageUrl("http://image");
        banner.setDisplayOrder(1);
    }

    @Test
    void getAll_ShouldReturnBanners() {
        when(bannerRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()).thenReturn(List.of(banner));

        List<BannerResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Title");
    }

    @Test
    void create_ShouldSaveAndEvictCache() {
        CreateBannerRequest request = new CreateBannerRequest();
        request.setTitle("New Title");
        request.setDescription("New Desc");
        request.setImageUrl("http://new-image");
        request.setDisplayOrder(2);

        when(bannerRepository.save(any(Banner.class))).thenAnswer(inv -> inv.getArgument(0));

        BannerResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("New Title");
        verify(homepageCacheService, times(1)).evict();
    }

    @Test
    void update_ShouldThrowException_WhenNotFound() {
        UpdateBannerRequest request = new UpdateBannerRequest();
        when(bannerRepository.findById(bannerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(bannerId, request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.BANNER_NOT_FOUND.getMessage());
    }

    @Test
    void update_ShouldSaveAndEvictCache_WhenExists() {
        UpdateBannerRequest request = new UpdateBannerRequest();
        request.setTitle("Updated Title");
        request.setDescription("Updated Desc");
        request.setImageUrl("http://updated-image");
        request.setDisplayOrder(3);

        when(bannerRepository.findById(bannerId)).thenReturn(Optional.of(banner));
        when(bannerRepository.save(any(Banner.class))).thenAnswer(inv -> inv.getArgument(0));

        BannerResponse response = service.update(bannerId, request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Updated Title");
        verify(homepageCacheService, times(1)).evict();
    }

    @Test
    void delete_ShouldThrowException_WhenNotFound() {
        when(bannerRepository.findById(bannerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(bannerId))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.BANNER_NOT_FOUND.getMessage());
    }

    @Test
    void delete_ShouldDeleteAndEvictCache_WhenExists() {
        when(bannerRepository.findById(bannerId)).thenReturn(Optional.of(banner));

        service.delete(bannerId);

        verify(bannerRepository, times(1)).delete(banner);
        verify(homepageCacheService, times(1)).evict();
    }

    @Test
    void uploadImage_ShouldThrowException_WhenFileNullOrEmpty() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(true);

        assertThatThrownBy(() -> service.uploadImage(file))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Banner image is required.");
    }

    @Test
    void uploadImage_ShouldThrowException_WhenFileNotImage() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("text/plain");

        assertThatThrownBy(() -> service.uploadImage(file))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Banner file must be an image.");
    }

    @Test
    void uploadImage_ShouldThrowException_WhenFileTooLarge() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("image/png");
        when(file.getSize()).thenReturn(11L * 1024L * 1024L);

        assertThatThrownBy(() -> service.uploadImage(file))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Banner image must not exceed 10 MB.");
    }

    @Test
    void uploadImage_ShouldUpload_WhenValid() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("image/png");
        when(file.getSize()).thenReturn(5L * 1024L * 1024L);
        when(seaweedFsService.uploadFile(file, "banners")).thenReturn("http://uploaded");

        String result = service.uploadImage(file);

        assertThat(result).isEqualTo("http://uploaded");
    }
}
