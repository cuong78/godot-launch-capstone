package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.service.StorageService;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Adapter cho SeaweedFS dùng HTTP REST API (thay thế gRPC Client để tránh lỗi routing IP Volume Server trong Docker).
 *
 * Config JSON: { "filerHost": "localhost", "filerGrpcPort": 18888, "filerHttpPort": 8888, "basePath": "/godotlaunch" }
 */
public class SeaweedFsAdapter implements StorageService {

    private final HttpClient httpClient;
    private final String filerHost;
    private final int filerHttpPort;
    private final String basePath;

    public SeaweedFsAdapter(String configJson) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode cfg = mapper.readTree(configJson);

            this.filerHost = cfg.get("filerHost").asText();
            this.filerHttpPort = cfg.has("filerHttpPort") ? cfg.get("filerHttpPort").asInt() : 8888;
            this.basePath = cfg.has("basePath")
                    ? cfg.get("basePath").asText().replaceAll("/$", "")
                    : "/godotlaunch";

            this.httpClient = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Invalid SeaweedFS HTTP config", e);
        }
    }

    /**
     * Upload file lên SeaweedFS qua HTTP PUT.
     * objectKey được dùng làm path trong filer (vd: "avatars/uuid_file.jpg")
     * → lưu tại basePath/objectKey (vd: /godotlaunch/avatars/uuid_file.jpg)
     */
    @Override
    public String upload(MultipartFile file, String objectKey) {
        String filerUrl = getFullUrl(objectKey);
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(filerUrl))
                    .PUT(HttpRequest.BodyPublishers.ofInputStream(() -> {
                        try {
                            return file.getInputStream();
                        } catch (IOException e) {
                            throw new java.io.UncheckedIOException(e);
                        }
                    }))
                    .header("Content-Type", file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IOException("Unexpected response status: " + response.statusCode() + " - " + response.body());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload to SeaweedFS via HTTP: " + filerUrl, e);
        }
        return getPublicUrl(objectKey);
    }

    /**
     * Xóa file khỏi filer qua HTTP DELETE.
     * objectKey = path tương đối (vd: "avatars/uuid_file.jpg")
     */
    @Override
    public void delete(String objectKey) {
        String filerUrl = getFullUrl(objectKey);
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(filerUrl))
                    .DELETE()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 && response.statusCode() != 204 && response.statusCode() != 404) {
                throw new IOException("Unexpected response status: " + response.statusCode() + " - " + response.body());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete from SeaweedFS via HTTP: " + filerUrl, e);
        }
    }

    /**
     * Public URL truy cập file qua Filer HTTP (port 8888).
     * objectKey = path tương đối (vd: "avatars/uuid_file.jpg")
     * → http://filerHost:8888/godotlaunch/avatars/uuid_file.jpg
     */
    @Override
    public String getPublicUrl(String objectKey) {
        return getFullUrl(objectKey);
    }

    /**
     * Đọc file từ SeaweedFS về dạng stream (dùng khi cần proxy file về client).
     * Caller có trách nhiệm đóng stream sau khi dùng.
     */
    public InputStream readFile(String objectKey) {
        String filerUrl = getFullUrl(objectKey);
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(filerUrl))
                    .GET()
                    .build();

            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IOException("Unexpected response status: " + response.statusCode());
            }
            return response.body();
        } catch (Exception e) {
            throw new RuntimeException("Failed to read from SeaweedFS via HTTP: " + filerUrl, e);
        }
    }

    private String getFullUrl(String objectKey) {
        String key = objectKey.startsWith("/") ? objectKey : "/" + objectKey;
        return String.format("http://%s:%d%s%s", filerHost, filerHttpPort, basePath, key);
    }
}
