package com.godotlaunch.backend.service.rag.impl;

import com.godotlaunch.backend.service.rag.RagIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagIngestionServiceImpl implements RagIngestionService {

    private final VectorStore vectorStore;

    @Override
    @Transactional
    public int ingestAllDocs() {
        log.info("Bắt đầu nạp và đánh chỉ mục Vector cho tất cả tài liệu trong classpath:docs/");
        int totalChunks = 0;

        try {
            ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:docs/*.md");

            TokenTextSplitter splitter = new TokenTextSplitter(400, 50, 10, 5000, true);
            List<Document> allDocumentsToIngest = new ArrayList<>();

            for (Resource resource : resources) {
                String filename = resource.getFilename();
                if (filename == null) continue;

                try (InputStream inputStream = resource.getInputStream()) {
                    String content = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
                    if (content.trim().isEmpty()) continue;

                    // Gán quyền truy cập cho tài liệu
                    List<String> allowedRoles = determineAllowedRoles(filename);
                    boolean isPublic = allowedRoles.contains("ROLE_CUSTOMER");

                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("document_id", filename);
                    metadata.put("title", extractTitle(filename, content));
                    metadata.put("allowed_roles", allowedRoles);
                    metadata.put("is_public", isPublic);

                    Document rawDoc = new Document(content, metadata);
                    List<Document> chunks = splitter.split(Collections.singletonList(rawDoc));

                    for (int i = 0; i < chunks.size(); i++) {
                        Document chunk = chunks.get(i);
                        chunk.getMetadata().putAll(metadata);
                        chunk.getMetadata().put("chunk_index", i);
                    }

                    allDocumentsToIngest.addAll(chunks);
                    log.info("Đã chia file {} thành {} chunks", filename, chunks.size());
                } catch (Exception e) {
                    log.error("Lỗi khi đọc file tài liệu {}: {}", filename, e.getMessage());
                }
            }

            if (!allDocumentsToIngest.isEmpty()) {
                vectorStore.add(allDocumentsToIngest);
                totalChunks = allDocumentsToIngest.size();
                log.info("Hoàn tất nạp thành công {} chunks vào VectorStore pgvector", totalChunks);
            }
        } catch (Exception e) {
            log.error("Lỗi trong quá trình Ingestion RAG docs: {}", e.getMessage(), e);
        }

        return totalChunks;
    }

    private List<String> determineAllowedRoles(String filename) {
        // Tài liệu admin / payout nhạy cảm chỉ cho Admin
        if (filename.contains("payout") || filename.contains("withdrawal-source") || filename.contains("bank-kyc")) {
            return List.of("ROLE_ADMIN");
        }
        // Tài liệu developer / publishing cho Developer & Admin
        if (filename.contains("publishing") || filename.contains("google-play") || filename.contains("source")) {
            return List.of("ROLE_DEVELOPER", "ROLE_ADMIN");
        }
        // Mặc định tài liệu quy trình chung public cho tất cả roles
        return List.of("ROLE_CUSTOMER", "ROLE_DEVELOPER", "ROLE_ADMIN");
    }

    private String extractTitle(String filename, String content) {
        String[] lines = content.split("\n");
        for (String line : lines) {
            if (line.startsWith("# ")) {
                return line.replace("# ", "").trim();
            }
        }
        return filename.replace(".md", "");
    }
}
