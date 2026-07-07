package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.service.StorageService;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Adapter cho SeaweedFS dùng HTTP REST API (thay thế gRPC Client để tránh lỗi routing IP Volume Server trong Docker).
 */
public class SeaweedFsAdapter implements StorageService {

    private final HttpClient httpClient;
    private final String filerHost;
    private final int filerHttpPort;
    private final String basePath;

    public SeaweedFsAdapter(String filerHost, int filerHttpPort, String basePath) {
        this.filerHost = filerHost;
        this.filerHttpPort = filerHttpPort;
        this.basePath = basePath != null ? basePath.replaceAll("/$", "") : "/godotlaunch";
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
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

    /**
     * Đảo ngược getFullUrl(): từ public URL đã lưu DB, tách lại objectKey gốc
     * (bỏ scheme/host/port/basePath, decode lại từng segment đã encode khi upload).
     * Dùng khi cần đọc lại file (download) từ URL đã lưu thay vì objectKey gốc.
     */
    public String extractObjectKey(String publicUrl) {
        String path = URI.create(publicUrl).getPath();
        if (path == null || path.isBlank()) {
            return null;
        }

        String normalizedBasePath = basePath.startsWith("/") ? basePath : "/" + basePath;
        String relativePath = path.startsWith(normalizedBasePath + "/")
                ? path.substring(normalizedBasePath.length() + 1)
                : (path.startsWith("/") ? path.substring(1) : path);

        String[] segments = relativePath.split("/");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) sb.append("/");
            sb.append(java.net.URLDecoder.decode(segments[i], StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private String getFullUrl(String objectKey) {
        String key = objectKey.startsWith("/") ? objectKey.substring(1) : objectKey;
        return String.format("http://%s:%d%s/%s", filerHost, filerHttpPort, basePath, encodePath(key));
    }

    /**
     * URL-encode từng segment của path (tên file user có thể chứa dấu cách, ngoặc, ký tự đặc biệt).
     * Giữ nguyên dấu '/' ngăn cách, chỉ encode nội dung mỗi segment.
     * URLEncoder mã hóa space thành '+', nhưng path cần '%20' → thay lại.
     */
    private String encodePath(String path) {
        String[] segments = path.split("/");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) sb.append("/");
            sb.append(URLEncoder.encode(segments[i], StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return sb.toString();
    }
}
