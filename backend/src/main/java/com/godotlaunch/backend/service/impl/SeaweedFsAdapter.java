package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.service.StorageService;
import org.springframework.web.multipart.MultipartFile;
import seaweedfs.client.FilerClient;
import seaweedfs.client.SeaweedInputStream;
import seaweedfs.client.SeaweedOutputStream;

import java.io.IOException;
import java.io.InputStream;

/**
 * Adapter cho SeaweedFS dùng gRPC Java Client (thay thế HTTP REST).
 *
 * Config JSON: { "filerHost": "localhost", "filerGrpcPort": 18888, "filerHttpPort": 8888, "basePath": "/godotlaunch" }
 *
 * Kiến trúc gRPC:
 *   App ──gRPC──▶ Filer:18888 ──▶ Volume:8081 (SeaweedFS tự quản lý)
 *
 * So với HTTP REST cũ:
 *   App ──HTTP──▶ Master:9333 (assign fid) ──HTTP──▶ Volume:8081 (PUT file)
 *   gRPC gộp 2 bước thành 1 stream, không cần tự parse fid hay manage volumeUrl.
 */
public class SeaweedFsAdapter implements StorageService {

    private final FilerClient filerClient;
    private final String filerHost;
    private final int filerHttpPort;
    private final String basePath;

    public SeaweedFsAdapter(String configJson) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode cfg = mapper.readTree(configJson);

            this.filerHost = cfg.get("filerHost").asText();
            int grpcPort = cfg.has("filerGrpcPort") ? cfg.get("filerGrpcPort").asInt() : 18888;
            this.filerHttpPort = cfg.has("filerHttpPort") ? cfg.get("filerHttpPort").asInt() : 8888;
            this.basePath = cfg.has("basePath")
                    ? cfg.get("basePath").asText().replaceAll("/$", "")
                    : "/godotlaunch";

            // FilerClient kết nối gRPC — singleton per adapter instance
            this.filerClient = new FilerClient(filerHost, grpcPort);
        } catch (Exception e) {
            throw new RuntimeException("Invalid SeaweedFS gRPC config", e);
        }
    }

    /**
     * Upload file lên SeaweedFS qua gRPC stream.
     * objectKey được dùng làm path trong filer (vd: "avatars/uuid_file.jpg")
     * → lưu tại basePath/objectKey (vd: /godotlaunch/avatars/uuid_file.jpg)
     */
    @Override
    public String upload(MultipartFile file, String objectKey) {
        String filerPath = basePath + "/" + objectKey;
        try (
            InputStream in = file.getInputStream();
            SeaweedOutputStream out = new SeaweedOutputStream(filerClient, filerPath)
        ) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
            out.flush();
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload to SeaweedFS via gRPC: " + filerPath, e);
        }
        return getPublicUrl(objectKey);
    }

    /**
     * Xóa file khỏi filer qua gRPC.
     * objectKey = path tương đối (vd: "avatars/uuid_file.jpg")
     */
    @Override
    public void delete(String objectKey) {
        String filerPath = basePath + "/" + objectKey;
        try {
            // rm(path, isRecursive, ignoreRecursiveError)
            filerClient.rm(filerPath, false, true);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete from SeaweedFS via gRPC: " + filerPath, e);
        }
    }

    /**
     * Public URL truy cập file qua Filer HTTP (port 8888).
     * objectKey = path tương đối (vd: "avatars/uuid_file.jpg")
     * → http://filerHost:8888/godotlaunch/avatars/uuid_file.jpg
     */
    @Override
    public String getPublicUrl(String objectKey) {
        return String.format("http://%s:%d%s/%s", filerHost, filerHttpPort, basePath, objectKey);
    }

    /**
     * Đọc file từ SeaweedFS về dạng stream (dùng khi cần proxy file về client).
     * Caller có trách nhiệm đóng stream sau khi dùng.
     */
    public SeaweedInputStream readFile(String objectKey) {
        String filerPath = basePath + "/" + objectKey;
        try {
            return new SeaweedInputStream(filerClient, filerPath);
        } catch (Exception e) {
            throw new RuntimeException("Failed to read from SeaweedFS via gRPC: " + filerPath, e);
        }
    }
}
