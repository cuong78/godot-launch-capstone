package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.ContentCollectionRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.ContentCollectionResponse;
import com.godotlaunch.backend.service.ContentCollectionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminContentCollectionControllerTest {

    @Mock
    private ContentCollectionService service;

    @InjectMocks
    private AdminContentCollectionController controller;

    @Test
    @DisplayName("getAll_ShouldReturnSuccess")
    void getAll_ShouldReturnSuccess() {
        ContentCollectionResponse responseDto = new ContentCollectionResponse();
        when(service.getAll()).thenReturn(List.of(responseDto));

        ResponseEntity<ApiResponse<List<ContentCollectionResponse>>> response = controller.getAll();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("create_ShouldReturnCreated")
    void create_ShouldReturnCreated() {
        ContentCollectionRequest request = new ContentCollectionRequest();
        ContentCollectionResponse responseDto = new ContentCollectionResponse();
        when(service.create(request)).thenReturn(responseDto);

        ResponseEntity<ApiResponse<ContentCollectionResponse>> response = controller.create(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getData()).isSameAs(responseDto);
    }

    @Test
    @DisplayName("update_ShouldReturnSuccess")
    void update_ShouldReturnSuccess() {
        UUID id = UUID.randomUUID();
        ContentCollectionRequest request = new ContentCollectionRequest();
        ContentCollectionResponse responseDto = new ContentCollectionResponse();
        when(service.update(id, request)).thenReturn(responseDto);

        ResponseEntity<ApiResponse<ContentCollectionResponse>> response = controller.update(id, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).isSameAs(responseDto);
    }

    @Test
    @DisplayName("delete_ShouldReturnSuccess")
    void delete_ShouldReturnSuccess() {
        UUID id = UUID.randomUUID();
        doNothing().when(service).delete(id);

        ResponseEntity<ApiResponse<Void>> response = controller.delete(id);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(service, times(1)).delete(id);
    }
}
