package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.*;
import com.godotlaunch.backend.dto.response.HomepageSectionResponse;
import com.godotlaunch.backend.entity.*;
import com.godotlaunch.backend.entity.enums.HomepageSectionType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HomepageSectionServiceImpl implements HomepageSectionService {
    private final HomepageSectionRepository sectionRepository;
    private final ContentCollectionRepository collectionRepository;
    private final HomepageService homepageService;

    @Override @Transactional(readOnly = true)
    public List<HomepageSectionResponse> getAll() { return sectionRepository.findAllByOrderByDisplayOrderAsc().stream().map(this::map).toList(); }

    @Override @Transactional
    public HomepageSectionResponse create(HomepageSectionRequest request) {
        ensureCollectionIsAvailable(request.getCollectionId(), null);
        HomepageSection section = new HomepageSection();
        section.setSectionType(HomepageSectionType.COLLECTION);
        section.setSystem(false);
        applyCollectionSection(section, request.getTitle(), request.getCollectionId(), request.getDisplayOrder(), request.isActive());
        HomepageSectionResponse response = map(sectionRepository.save(section));
        homepageService.invalidateCache();
        return response;
    }

    @Override @Transactional
    public HomepageSectionResponse update(UUID id, UpdateHomepageSectionRequest request) {
        HomepageSection section = sectionRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.HOMEPAGE_SECTION_NOT_FOUND));
        section.setTitle(request.getTitle().trim());
        section.setDisplayOrder(request.getDisplayOrder());
        section.setActive(request.isActive());
        if (!section.isSystem()) {
            UUID collectionId = request.getCollectionId() == null
                    ? section.getCollection().getId()
                    : request.getCollectionId();
            ensureCollectionIsAvailable(collectionId, id);
            applyCollectionSection(section, request.getTitle(), collectionId, request.getDisplayOrder(), request.isActive());
        }
        HomepageSectionResponse response = map(sectionRepository.save(section));
        homepageService.invalidateCache();
        return response;
    }

    @Override @Transactional
    public void delete(UUID id) {
        HomepageSection section = sectionRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.HOMEPAGE_SECTION_NOT_FOUND));
        if (section.isSystem()) throw new AppException(ErrorCode.SYSTEM_SECTION_PROTECTED);
        sectionRepository.delete(section);
        homepageService.invalidateCache();
    }

    private void applyCollectionSection(HomepageSection section, String title, UUID collectionId, Integer order, boolean active) {
        ContentCollection collection = collectionRepository.findById(collectionId).orElseThrow(() -> new AppException(ErrorCode.COLLECTION_NOT_FOUND));
        section.setTitle(title.trim()); section.setCollection(collection); section.setDisplayOrder(order);
        section.setActive(active);
    }

    private void ensureCollectionIsAvailable(UUID collectionId, UUID sectionId) {
        boolean alreadyAssigned = sectionId == null
                ? sectionRepository.existsByCollectionId(collectionId)
                : sectionRepository.existsByCollectionIdAndIdNot(collectionId, sectionId);
        if (alreadyAssigned) throw new AppException(ErrorCode.COLLECTION_ALREADY_ON_HOMEPAGE);
    }

    private HomepageSectionResponse map(HomepageSection section) {
        return HomepageSectionResponse.builder().id(section.getId()).title(section.getTitle()).sectionType(section.getSectionType())
                .collectionId(section.getCollection() == null ? null : section.getCollection().getId())
                .collectionSlug(section.getCollection() == null ? null : section.getCollection().getSlug())
                .displayOrder(section.getDisplayOrder()).active(section.isActive()).system(section.isSystem())
                .products(List.of()).build();
    }
}
