package com.godotlaunch.backend.service.rag.impl;

import com.godotlaunch.backend.service.rag.RagRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagRetrievalServiceImpl implements RagRetrievalService {

    private final VectorStore vectorStore;

    @Override
    @Transactional(readOnly = true)
    public List<Document> retrieveRelevantChunks(String query, String userRole, int topK) {
        log.info("Tìm kiếm RAG cho câu hỏi: '{}' với role: '{}'", query, userRole);

        try {
            SearchRequest searchRequest = SearchRequest.builder()
                    .query(query)
                    .topK(topK * 2) // Lấy thừa ra để filter role
                    .similarityThreshold(0.65)
                    .build();

            List<Document> rawResults = vectorStore.similaritySearch(searchRequest);

            // Filter kết quả theo quyền role của user
            return rawResults.stream()
                    .filter(doc -> isAuthorized(doc, userRole))
                    .limit(topK)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Lỗi khi tìm kiếm Vector RAG: {}", e.getMessage(), e);
            return List.of();
        }
    }

    private boolean isAuthorized(Document doc, String userRole) {
        Object isPublicObj = doc.getMetadata().get("is_public");
        if (Boolean.TRUE.equals(isPublicObj)) {
            return true;
        }

        Object allowedRolesObj = doc.getMetadata().get("allowed_roles");
        if (allowedRolesObj instanceof List<?> roles) {
            String roleName = userRole.startsWith("ROLE_") ? userRole : "ROLE_" + userRole.toUpperCase();
            return roles.contains(roleName) || roles.contains("ROLE_ADMIN");
        }

        return true;
    }
}
