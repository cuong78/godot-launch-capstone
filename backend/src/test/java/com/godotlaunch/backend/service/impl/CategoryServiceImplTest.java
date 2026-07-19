package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CategoryRequest;
import com.godotlaunch.backend.dto.response.CategoryResponse;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceImplTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    private UUID categoryId;
    private Category category;

    @BeforeEach
    void setUp() {
        categoryId = UUID.randomUUID();

        category = new Category();
        category.setId(categoryId);
        category.setName("Action");
        category.setSlug("action");
        category.setDescription("Action games");
        category.setType("game");
    }

    @Test
    @DisplayName("shouldCreateCategory_WhenValidRequest")
    void shouldCreateCategory_WhenValidRequest() {
        // Arrange
        CategoryRequest request = new CategoryRequest();
        request.setName("Action");
        request.setSlug("action");
        request.setDescription("Action games");
        request.setType("game");

        when(categoryRepository.existsByName("Action")).thenReturn(false);
        when(categoryRepository.existsBySlug("action")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(category);

        // Act
        CategoryResponse response = categoryService.createCategory(request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Action");
        verify(categoryRepository, times(1)).save(any(Category.class));
    }

    @Test
    @DisplayName("shouldThrowException_WhenCreateCategoryDuplicateNameOrSlug")
    void shouldThrowException_WhenCreateCategoryDuplicateNameOrSlug() {
        // Arrange
        CategoryRequest request = new CategoryRequest();
        request.setName("Action");
        request.setSlug("action");

        when(categoryRepository.existsByName("Action")).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> categoryService.createCategory(request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_ALREADY_EXISTS);

        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    @DisplayName("shouldUpdateCategory_WhenValidRequest")
    void shouldUpdateCategory_WhenValidRequest() {
        // Arrange
        CategoryRequest request = new CategoryRequest();
        request.setName("Action & Adventure");
        request.setSlug("action-adventure");
        request.setType("game");

        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(categoryRepository.findByName("Action & Adventure")).thenReturn(Optional.empty());
        when(categoryRepository.findBySlug("action-adventure")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        CategoryResponse response = categoryService.updateCategory(categoryId, request);

        // Assert
        assertThat(response.getName()).isEqualTo("Action & Adventure");
        verify(categoryRepository, times(1)).save(category);
    }

    @Test
    @DisplayName("shouldThrowException_WhenUpdateCategoryParentCycle")
    void shouldThrowException_WhenUpdateCategoryParentCycle() {
        // Arrange
        CategoryRequest request = new CategoryRequest();
        request.setName("Action");
        request.setSlug("action");
        request.setParentId(categoryId); // Self parent cycle

        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));

        // Act & Assert
        assertThatThrownBy(() -> categoryService.updateCategory(categoryId, request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_PARENT_CYCLE);
    }

    @Test
    @DisplayName("shouldDeleteCategory_WhenExists")
    void shouldDeleteCategory_WhenExists() {
        // Arrange
        when(categoryRepository.existsById(categoryId)).thenReturn(true);

        // Act
        categoryService.deleteCategory(categoryId);

        // Assert
        verify(categoryRepository, times(1)).deleteById(categoryId);
    }

    @Test
    @DisplayName("shouldGetCategoryById_WhenExists")
    void shouldGetCategoryById_WhenExists() {
        // Arrange
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));

        // Act
        CategoryResponse response = categoryService.getCategoryById(categoryId);

        // Assert
        assertThat(response.getId()).isEqualTo(categoryId);
        assertThat(response.getSlug()).isEqualTo("action");
    }

    @Test
    @DisplayName("shouldGetCategoriesByType_WhenFiltered")
    void shouldGetCategoriesByType_WhenFiltered() {
        // Arrange
        when(categoryRepository.findByType("game")).thenReturn(List.of(category));

        // Act
        List<CategoryResponse> list = categoryService.getCategoriesByType("game");

        // Assert
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getType()).isEqualTo("game");
    }
}
