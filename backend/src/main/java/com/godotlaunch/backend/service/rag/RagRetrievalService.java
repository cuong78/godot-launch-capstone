package com.godotlaunch.backend.service.rag;

import org.springframework.ai.document.Document;

import java.util.List;

public interface RagRetrievalService {
    List<Document> retrieveRelevantChunks(String query, String userRole, int topK);
}
