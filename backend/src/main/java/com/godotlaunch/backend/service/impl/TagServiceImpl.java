package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.TagRequest;
import com.godotlaunch.backend.dto.response.TagResponse;
import com.godotlaunch.backend.entity.Tag;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.TagRepository;
import com.godotlaunch.backend.service.TagService;
import com.godotlaunch.backend.utils.TranslationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class TagServiceImpl implements TagService {
    private final TagRepository repository;
    @Override @Transactional(readOnly = true) public List<TagResponse> getAll() { return repository.findAllByOrderByNameAsc().stream().map(this::map).toList(); }
    @Override @Transactional(readOnly = true) public List<TagResponse> search(String query, int limit) {
        String normalizedQuery = query == null ? "" : query.trim();
        int safeLimit = Math.max(1, Math.min(limit, 20));
        return repository.search(normalizedQuery, PageRequest.of(0, safeLimit)).stream().map(this::map).toList();
    }
    @Override @Transactional public TagResponse create(TagRequest request) {
        if (repository.existsByName(request.getName()) || repository.existsBySlug(request.getSlug())) throw new AppException(ErrorCode.TAG_ALREADY_EXISTS);
        Tag tag = new Tag();
        tag.setName(request.getName().trim());
        tag.setNameVi(request.getNameVi() != null ? request.getNameVi().trim() : null);
        tag.setNameEn(request.getNameEn() != null ? request.getNameEn().trim() : null);
        tag.setNameJa(request.getNameJa() != null ? request.getNameJa().trim() : null);
        tag.setSlug(request.getSlug().trim());
        return map(repository.save(tag));
    }
    @Override @Transactional public TagResponse update(UUID id, TagRequest request) {
        Tag tag = repository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TAG_NOT_FOUND));
        repository.findByName(request.getName()).ifPresent(found -> { if (!found.getId().equals(id)) throw new AppException(ErrorCode.TAG_ALREADY_EXISTS); });
        repository.findBySlug(request.getSlug()).ifPresent(found -> { if (!found.getId().equals(id)) throw new AppException(ErrorCode.TAG_ALREADY_EXISTS); });
        tag.setName(request.getName().trim());
        tag.setNameVi(request.getNameVi() != null ? request.getNameVi().trim() : null);
        tag.setNameEn(request.getNameEn() != null ? request.getNameEn().trim() : null);
        tag.setNameJa(request.getNameJa() != null ? request.getNameJa().trim() : null);
        tag.setSlug(request.getSlug().trim());
        return map(repository.save(tag));
    }
    @Override @Transactional public void delete(UUID id) { if (!repository.existsById(id)) throw new AppException(ErrorCode.TAG_NOT_FOUND); repository.deleteById(id); }
    private TagResponse map(Tag tag) { return TranslationUtils.mapTag(tag); }
}
