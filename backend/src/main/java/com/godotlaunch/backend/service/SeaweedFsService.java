package com.godotlaunch.backend.service;

import com.godotlaunch.backend.service.impl.SeaweedFsAdapter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Service to handle file storage operations using SeaweedFS Filer HTTP API.
 * Replaces the old AwsS3Service.
 */
@Service
public class SeaweedFsService {

    private final SeaweedFsAdapter seaweedAdapter;
    private final String filerHost;
    private final int filerPort;
    private final String basePath;
    private final HttpClient httpClient;

    public SeaweedFsService(
            @Value("${storage.seaweedfs.filer-host:localhost}") String filerHost,
            @Value("${storage.seaweedfs.filer-port:8888}") int filerPort,
            @Value("${storage.seaweedfs.base-path:/godotlaunch}") String basePath) {
        this.filerHost = filerHost;
        this.filerPort = filerPort;
        this.basePath = basePath != null ? basePath.replaceAll("/$", "") : "/godotlaunch";
        this.seaweedAdapter = new SeaweedFsAdapter(filerHost, filerPort, basePath);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public String generatePresignedUploadUrl(String objectKey, String contentType) {
        return seaweedAdapter.getPublicUrl(objectKey);
    }

    public String generatePresignedGetUrl(String objectKey, Duration duration) {
        return seaweedAdapter.getPublicUrl(objectKey);
    }

    public String getFileUrl(String objectKey) {
        return seaweedAdapter.getPublicUrl(objectKey);
    }

    public InputStream getObjectStream(String objectKey) {
        return seaweedAdapter.readFile(objectKey);
    }

    public void deleteObject(String objectKey) {
        seaweedAdapter.delete(objectKey);
    }

    public String uploadFile(MultipartFile file, String prefix) {
        String objectKey = prefix + "/" + java.util.UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        return seaweedAdapter.upload(file, objectKey);
    }

    public String uploadWithKey(MultipartFile file, String objectKey) {
        return seaweedAdapter.upload(file, objectKey);
    }

    /**
     * Upload an InputStream directly to SeaweedFS Filer.
     * Useful for extracting and uploading individual files from a ZIP archive.
     */
    public String uploadStream(InputStream inputStream, String objectKey, String contentType) {
        String filerUrl = getFullUrl(objectKey);
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(filerUrl))
                    .PUT(HttpRequest.BodyPublishers.ofInputStream(() -> inputStream))
                    .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new java.io.IOException("Unexpected response status: " + response.statusCode() + " - " + response.body());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload stream to SeaweedFS via HTTP: " + filerUrl, e);
        }
        return getFileUrl(objectKey);
    }

    private String getFullUrl(String objectKey) {
        String key = objectKey.startsWith("/") ? objectKey.substring(1) : objectKey;
        return String.format("http://%s:%d%s/%s", filerHost, filerPort, basePath, encodePath(key));
    }

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
