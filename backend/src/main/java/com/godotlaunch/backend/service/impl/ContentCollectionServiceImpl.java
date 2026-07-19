package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.ContentCollectionRequest;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.entity.*;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ContentCollectionServiceImpl implements ContentCollectionService {
    private final ContentCollectionRepository collectionRepository;
    private final TagRepository tagRepository;
    private final CategoryRepository categoryRepository;
    private final HomepageService homepageService;

    @Override @Transactional(readOnly = true)
    public List<ContentCollectionResponse> getAll() {
        return collectionRepository.findAll().stream().map(this::map).toList();
    }

    @Override @Transactional
    public ContentCollectionResponse create(ContentCollectionRequest request) {
        if (collectionRepository.existsBySlug(request.getSlug())) throw new AppException(ErrorCode.COLLECTION_SLUG_EXISTS);
        ContentCollection collection = new ContentCollection();
        apply(collection, request);
        ContentCollectionResponse response = map(collectionRepository.save(collection));
        homepageService.invalidateCache();
        return response;
    }

    @Override @Transactional
    public ContentCollectionResponse update(UUID id, ContentCollectionRequest request) {
        ContentCollection collection = collectionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COLLECTION_NOT_FOUND));
        collectionRepository.findBySlug(request.getSlug()).ifPresent(found -> {
            if (!found.getId().equals(id)) throw new AppException(ErrorCode.COLLECTION_SLUG_EXISTS);
        });
        apply(collection, request);
        ContentCollectionResponse response = map(collectionRepository.save(collection));
        homepageService.invalidateCache();
        return response;
    }

    @Override @Transactional
    public void delete(UUID id) {
        if (!collectionRepository.existsById(id)) throw new AppException(ErrorCode.COLLECTION_NOT_FOUND);
        collectionRepository.deleteById(id);
        homepageService.invalidateCache();
    }

    private void apply(ContentCollection entity, ContentCollectionRequest request) {
        entity.setTitle(request.getTitle().trim());
        entity.setSlug(request.getSlug().trim());
        entity.setDescription(request.getDescription());
        entity.setMaxItems(request.getMaxItems());
        entity.setActive(request.isActive());
        Set<UUID> tagIds = request.getTagIds() == null ? Set.of() : request.getTagIds();
        Set<UUID> categoryIds = request.getCategoryIds() == null ? Set.of() : request.getCategoryIds();
        List<Tag> tags = tagRepository.findAllById(tagIds);
        List<Category> categories = categoryRepository.findAllById(categoryIds);
        if (tags.size() != tagIds.size()) throw new AppException(ErrorCode.TAG_NOT_FOUND);
        if (categories.size() != categoryIds.size()) throw new AppException(ErrorCode.CATEGORY_NOT_FOUND);
        entity.setTags(new HashSet<>(tags));
        entity.setCategories(new HashSet<>(categories));
    }

    private ContentCollectionResponse map(ContentCollection entity) {
        return ContentCollectionResponse.builder()
                .id(entity.getId()).title(entity.getTitle()).slug(entity.getSlug()).description(entity.getDescription())
                .maxItems(entity.getMaxItems()).active(entity.isActive())
                .tags(entity.getTags().stream().map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).slug(tag.getSlug()).build()).toList())
                .categories(entity.getCategories().stream().map(category -> CategoryResponse.builder()
                        .id(category.getId()).name(category.getName()).slug(category.getSlug()).description(category.getDescription())
                        .parentId(category.getParent() == null ? null : category.getParent().getId()).type(category.getType()).createdAt(category.getCreatedAt()).build()).toList())
                .createdAt(entity.getCreatedAt()).updatedAt(entity.getUpdatedAt()).build();
    }
}
