//package com.godotlaunch.backend.service.impl;
//
//import com.godotlaunch.backend.dto.request.CategoryRequest;
//import com.godotlaunch.backend.dto.response.CategoryResponse;
//import com.godotlaunch.backend.entity.Category;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.List;
//import java.util.UUID;
//import java.util.stream.Collectors;
//
//@Service
//public class CategoryServiceImpl implements CategoryService {
//
//    private final CategoryRepository categoryRepository;
//
//    public CategoryServiceImpl(CategoryRepository categoryRepository) {
//        this.categoryRepository = categoryRepository;
//    }
//
//    @Override
//    @Transactional
//    public CategoryResponse createCategory(CategoryRequest request) {
//        Category category = new Category();
//        mapRequestToEntity(request, category);
//        Category savedCategory = categoryRepository.save(category);
//        return mapEntityToResponse(savedCategory);
//    }
//
//    @Override
//    @Transactional
//    public CategoryResponse updateCategory(UUID id, CategoryRequest request) {
//        Category category = categoryRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Category not found"));
//        mapRequestToEntity(request, category);
//        Category updatedCategory = categoryRepository.save(category);
//        return mapEntityToResponse(updatedCategory);
//    }
//
//    @Override
//    @Transactional
//    public void deleteCategory(UUID id) {
//        if (!categoryRepository.existsById(id)) {
//            throw new RuntimeException("Category not found");
//        }
//        categoryRepository.deleteById(id);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public CategoryResponse getCategoryById(UUID id) {
//        Category category = categoryRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Category not found"));
//        return mapEntityToResponse(category);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public List<CategoryResponse> getAllCategories() {
//        return categoryRepository.findAll().stream()
//                .map(this::mapEntityToResponse)
//                .collect(Collectors.toList());
//    }
//
//    private void mapRequestToEntity(CategoryRequest request, Category category) {
//        category.setName(request.getName());
//        category.setSlug(request.getSlug());
//        category.setDescription(request.getDescription());
//
//        if (request.getParentId() != null) {
//            Category parent = categoryRepository.findById(request.getParentId())
//                    .orElseThrow(() -> new RuntimeException("Parent category not found"));
//            category.setParent(parent);
//        } else {
//            category.setParent(null);
//        }
//    }
//
//    private CategoryResponse mapEntityToResponse(Category category) {
//        return CategoryResponse.builder()
//                .id(category.getId())
//                .name(category.getName())
//                .slug(category.getSlug())
//                .description(category.getDescription())
//                .parentId(category.getParent() != null ? category.getParent().getId() : null)
//                .createdAt(category.getCreatedAt())
//                .build();
//    }
//}
