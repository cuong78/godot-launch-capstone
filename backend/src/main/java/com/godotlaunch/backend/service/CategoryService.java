package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CategoryRequest;
import com.godotlaunch.backend.dto.response.CategoryResponse;

import java.util.List;
import java.util.UUID;

public interface CategoryService {
    CategoryResponse createCategory(CategoryRequest request);
    CategoryResponse updateCategory(UUID id, CategoryRequest request);
    void deleteCategory(UUID id);
    CategoryResponse getCategoryById(UUID id);
    List<CategoryResponse> getAllCategories();
    List<CategoryResponse> getCategoriesByType(String type);
}
