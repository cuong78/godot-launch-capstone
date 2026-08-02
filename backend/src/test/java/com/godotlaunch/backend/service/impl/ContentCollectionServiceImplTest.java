package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.ContentCollectionRequest;
import com.godotlaunch.backend.dto.response.ContentCollectionResponse;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.ContentCollection;
import com.godotlaunch.backend.entity.Tag;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.CategoryRepository;
import com.godotlaunch.backend.repository.ContentCollectionRepository;
import com.godotlaunch.backend.repository.TagRepository;
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
class ContentCollectionServiceImplTest {

    @Mock
    private ContentCollectionRepository collectionRepository;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private HomepageService homepageService;

    @InjectMocks
    private ContentCollectionServiceImpl service;

    private ContentCollection collection;
    private ContentCollectionRequest request;
    private UUID collectionId;

    @BeforeEach
    void setUp() {
        collectionId = UUID.randomUUID();
        collection = new ContentCollection();
        collection.setId(collectionId);
        collection.setTitle("Original Title");
        collection.setSlug("original-slug");
        collection.setDescription("Desc");
        collection.setMaxItems(5);
        collection.setActive(true);
        collection.setTags(new HashSet<>());
        collection.setCategories(new HashSet<>());

        request = new ContentCollectionRequest();
        request.setTitle("New Title");
        request.setSlug("new-slug");
        request.setDescription("New Desc");
        request.setMaxItems(10);
        request.setActive(true);
        request.setTagIds(Set.of());
        request.setCategoryIds(Set.of());
    }

    @Test
    void getAll_ShouldReturnAllCollections() {
        when(collectionRepository.findAll()).thenReturn(List.of(collection));

        List<ContentCollectionResponse> result = service.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Original Title");
    }

    @Test
    void create_ShouldThrowException_WhenSlugExists() {
        when(collectionRepository.existsBySlug(request.getSlug())).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.COLLECTION_SLUG_EXISTS.getMessage());
    }

    @Test
    void create_ShouldSaveAndInvalidateCache_WhenValid() {
        when(collectionRepository.existsBySlug(request.getSlug())).thenReturn(false);
        when(collectionRepository.save(any(ContentCollection.class))).thenAnswer(inv -> inv.getArgument(0));

        ContentCollectionResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("New Title");
        verify(homepageService, times(1)).invalidateCache();
    }

    @Test
    void create_ShouldThrowException_WhenTagNotFound() {
        UUID missingTagId = UUID.randomUUID();
        request.setTagIds(Set.of(missingTagId));

        when(collectionRepository.existsBySlug(request.getSlug())).thenReturn(false);
        when(tagRepository.findAllById(request.getTagIds())).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.TAG_NOT_FOUND.getMessage());
    }

    @Test
    void create_ShouldThrowException_WhenCategoryNotFound() {
        UUID missingCategoryId = UUID.randomUUID();
        request.setCategoryIds(Set.of(missingCategoryId));

        when(collectionRepository.existsBySlug(request.getSlug())).thenReturn(false);
        when(categoryRepository.findAllById(request.getCategoryIds())).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.CATEGORY_NOT_FOUND.getMessage());
    }

    @Test
    void update_ShouldThrowException_WhenNotFound() {
        when(collectionRepository.findById(collectionId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(collectionId, request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.COLLECTION_NOT_FOUND.getMessage());
    }

    @Test
    void update_ShouldThrowException_WhenSlugExistsForOtherCollection() {
        ContentCollection another = new ContentCollection();
        another.setId(UUID.randomUUID());
        another.setSlug("new-slug");

        when(collectionRepository.findById(collectionId)).thenReturn(Optional.of(collection));
        when(collectionRepository.findBySlug(request.getSlug())).thenReturn(Optional.of(another));

        assertThatThrownBy(() -> service.update(collectionId, request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.COLLECTION_SLUG_EXISTS.getMessage());
    }

    @Test
    void update_ShouldSaveAndInvalidateCache_WhenValid() {
        when(collectionRepository.findById(collectionId)).thenReturn(Optional.of(collection));
        when(collectionRepository.findBySlug(request.getSlug())).thenReturn(Optional.of(collection));
        when(collectionRepository.save(any(ContentCollection.class))).thenAnswer(inv -> inv.getArgument(0));

        ContentCollectionResponse response = service.update(collectionId, request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("New Title");
        verify(homepageService, times(1)).invalidateCache();
    }

    @Test
    void delete_ShouldThrowException_WhenNotFound() {
        when(collectionRepository.existsById(collectionId)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(collectionId))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(ErrorCode.COLLECTION_NOT_FOUND.getMessage());
    }

    @Test
    void delete_ShouldDeleteAndInvalidateCache_WhenExists() {
        when(collectionRepository.existsById(collectionId)).thenReturn(true);

        service.delete(collectionId);

        verify(collectionRepository, times(1)).deleteById(collectionId);
        verify(homepageService, times(1)).invalidateCache();
    }
}
