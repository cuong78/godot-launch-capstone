package com.godotlaunch.backend.repository;

import java.util.UUID;

public interface CodeEmbeddingMatchProjection {
    UUID getEmbeddingId();
    Float getSimilarityScore();
}
