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
    private final String publicHost;
    private final int publicPort;
    private final String basePath;
    private final HttpClient httpClient;

    public SeaweedFsService(
            @Value("${storage.seaweedfs.filer-host:localhost}") String filerHost,
            @Value("${storage.seaweedfs.filer-port:8888}") int filerPort,
            @Value("${storage.seaweedfs.public-host:localhost}") String publicHost,
            @Value("${storage.seaweedfs.public-port:8888}") int publicPort,
            @Value("${storage.seaweedfs.base-path:/godotlaunch}") String basePath) {
        this.filerHost = filerHost;
        this.filerPort = filerPort;
        this.publicHost = publicHost;
        this.publicPort = publicPort;
        this.basePath = basePath != null ? basePath.replaceAll("/$", "") : "/godotlaunch";
        this.seaweedAdapter = new SeaweedFsAdapter(filerHost, filerPort, basePath);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public String resolvePublicUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return rawUrl;
        }
        String internalPrefix = "http://" + filerHost + ":" + filerPort;
        String publicPrefix = "http://" + publicHost + ":" + publicPort;
        
        if (rawUrl.startsWith(internalPrefix)) {
            return rawUrl.replace(internalPrefix, publicPrefix);
        }
        
        if (rawUrl.contains("http://seaweedfs-filer:8888")) {
            return rawUrl.replace("http://seaweedfs-filer:8888", publicPrefix);
        }
        
        return rawUrl;
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

    /** Xóa cả 1 thư mục (và mọi file bên trong) trên Filer — dùng khi thay web demo bằng bản build mới. */
    public void deleteObjectRecursive(String objectKeyPrefix) {
        seaweedAdapter.deleteRecursive(objectKeyPrefix);
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
        return uploadStream(inputStream, objectKey, contentType, null);
    }

    /**
     * Upload an InputStream directly to SeaweedFS Filer, với Cache-Control tùy chọn.
     * Chỉ nên set cache dài hạn (immutable) khi objectKey là duy nhất theo version (VD: web demo có UUID version
     * trong path) — nếu không, browser sẽ tiếp tục hiển thị bản cũ sau khi ghi đè file tại cùng path.
     */
    public String uploadStream(InputStream inputStream, String objectKey, String contentType, String cacheControl) {
        String filerUrl = getFullUrl(objectKey);
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(filerUrl))
                    .PUT(HttpRequest.BodyPublishers.ofInputStream(() -> inputStream))
                    .header("Content-Type", contentType != null ? contentType : "application/octet-stream");
            if (cacheControl != null && !cacheControl.isBlank()) {
                builder.header("Cache-Control", cacheControl);
            }
            HttpRequest request = builder.build();

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
