package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.HomepageSectionRequest;
import com.godotlaunch.backend.dto.request.UpdateHomepageSectionRequest;
import com.godotlaunch.backend.dto.response.HomepageSectionResponse;
import com.godotlaunch.backend.entity.ContentCollection;
import com.godotlaunch.backend.entity.HomepageSection;
import com.godotlaunch.backend.entity.enums.HomepageSectionType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.ContentCollectionRepository;
import com.godotlaunch.backend.repository.HomepageSectionRepository;
import com.godotlaunch.backend.service.HomepageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomepageSectionServiceImplTest {

    @Mock
    private HomepageSectionRepository sectionRepository;
    @Mock
    private ContentCollectionRepository collectionRepository;
    @Mock
    private HomepageService homepageService;

    @InjectMocks
    private HomepageSectionServiceImpl service;

    private HomepageSection section;
    private ContentCollection collection;
    private UUID sectionId;
    private UUID collectionId;

    @BeforeEach
    void setUp() {
        sectionId = UUID.randomUUID();
        collectionId = UUID.randomUUID();

        collection = new ContentCollection();
        collection.setId(collectionId);
        collection.setSlug("test-slug");

        section = new HomepageSection();
        section.setId(sectionId);
        section.setTitle("Original Title");
        section.setSectionType(HomepageSectionType.COLLECTION);
        section.setDisplayOrder(1);
        section.setActive(true);
        section.setSystem(false);
        section.setCollection(collection);
    }

    @Test
    void getAll_ShouldReturnOrderedSections() {
        when(sectionRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(section));

        List<HomepageSectionResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Original Title");
    }

    @Test
    void create_ShouldThrowException_WhenCollectionAlreadyAssigned() {
        HomepageSectionRequest request = new HomepageSectionRequest();
        request.setTitle("New Section");
        request.setCollectionId(collectionId);
        request.setDisplayOrder(2);
        request.setActive(true);

        when(sectionRepository.existsByCollectionId(collectionId)).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.COLLECTION_ALREADY_ON_HOMEPAGE.getMessage());
    }

    @Test
    void create_ShouldThrowException_WhenCollectionNotFound() {
        HomepageSectionRequest request = new HomepageSectionRequest();
        request.setTitle("New Section");
        request.setCollectionId(collectionId);
        request.setDisplayOrder(2);
        request.setActive(true);

        when(sectionRepository.existsByCollectionId(collectionId)).thenReturn(false);
        when(collectionRepository.findById(collectionId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.COLLECTION_NOT_FOUND.getMessage());
    }

    @Test
    void create_ShouldSaveAndInvalidateCache_WhenValid() {
        HomepageSectionRequest request = new HomepageSectionRequest();
        request.setTitle("New Section");
        request.setCollectionId(collectionId);
        request.setDisplayOrder(2);
        request.setActive(true);

        when(sectionRepository.existsByCollectionId(collectionId)).thenReturn(false);
        when(collectionRepository.findById(collectionId)).thenReturn(Optional.of(collection));
        when(sectionRepository.save(any(HomepageSection.class))).thenAnswer(inv -> inv.getArgument(0));

        HomepageSectionResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("New Section");
        verify(homepageService, times(1)).invalidateCache();
    }

    @Test
    void update_ShouldThrowException_WhenNotFound() {
        UpdateHomepageSectionRequest request = new UpdateHomepageSectionRequest();
        request.setTitle("Updated Title");

        when(sectionRepository.findById(sectionId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(sectionId, request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.HOMEPAGE_SECTION_NOT_FOUND.getMessage());
    }

    @Test
    void update_ShouldUpdateNonSystemSection_WhenValid() {
        UpdateHomepageSectionRequest request = new UpdateHomepageSectionRequest();
        request.setTitle("Updated Title");
        request.setCollectionId(collectionId);
        request.setDisplayOrder(5);
        request.setActive(true);

        when(sectionRepository.findById(sectionId)).thenReturn(Optional.of(section));
        when(sectionRepository.existsByCollectionIdAndIdNot(collectionId, sectionId)).thenReturn(false);
        when(collectionRepository.findById(collectionId)).thenReturn(Optional.of(collection));
        when(sectionRepository.save(any(HomepageSection.class))).thenAnswer(inv -> inv.getArgument(0));

        HomepageSectionResponse response = service.update(sectionId, request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Updated Title");
        assertThat(response.getDisplayOrder()).isEqualTo(5);
        verify(homepageService, times(1)).invalidateCache();
    }

    @Test
    void update_ShouldUpdateSystemSection_WithoutCollectionAssigned() {
        section.setSystem(true);
        section.setCollection(null);

        UpdateHomepageSectionRequest request = new UpdateHomepageSectionRequest();
        request.setTitle("Updated Title");
        request.setDisplayOrder(5);
        request.setActive(true);

        when(sectionRepository.findById(sectionId)).thenReturn(Optional.of(section));
        when(sectionRepository.save(any(HomepageSection.class))).thenAnswer(inv -> inv.getArgument(0));

        HomepageSectionResponse response = service.update(sectionId, request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Updated Title");
        verify(homepageService, times(1)).invalidateCache();
    }

    @Test
    void delete_ShouldThrowException_WhenNotFound() {
        when(sectionRepository.findById(sectionId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(sectionId))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.HOMEPAGE_SECTION_NOT_FOUND.getMessage());
    }

    @Test
    void delete_ShouldThrowException_WhenSectionIsSystem() {
        section.setSystem(true);
        when(sectionRepository.findById(sectionId)).thenReturn(Optional.of(section));

        assertThatThrownBy(() -> service.delete(sectionId))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.SYSTEM_SECTION_PROTECTED.getMessage());
    }

    @Test
    void delete_ShouldDelete_WhenValid() {
        when(sectionRepository.findById(sectionId)).thenReturn(Optional.of(section));

        service.delete(sectionId);

        verify(sectionRepository, times(1)).delete(section);
        verify(homepageService, times(1)).invalidateCache();
    }
}
