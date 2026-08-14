package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.CodeEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CodeEmbeddingRepository extends JpaRepository<CodeEmbedding, UUID> {

    Optional<CodeEmbedding> findBySourceSnapshotIdAndModelNameAndModelVersion(
            UUID sourceSnapshotId, String modelName, String modelVersion);

    @Query(value = "SELECT ranked.embedding_id AS embeddingId, "
            + "ranked.similarity_score AS similarityScore "
            + "FROM ( "
            + "SELECT DISTINCT ON (candidate.game_id) "
            + "candidate.id AS embedding_id, "
            + "(1 - cosine_distance(candidate.embedding, cast(:embedding as vector))) AS similarity_score, "
            + "candidate.game_id "
            + "FROM code_embeddings candidate "
            + "WHERE candidate.game_id != :gameId "
            + "AND candidate.model_name = :modelName "
            + "AND candidate.model_version = :modelVersion "
            + "ORDER BY candidate.game_id, cosine_distance(candidate.embedding, cast(:embedding as vector)) "
            + ") ranked "
            + "ORDER BY ranked.similarity_score DESC "
            + "LIMIT :resultLimit", nativeQuery = true)
    List<CodeEmbeddingMatchProjection> findClosestFromOtherGames(
            @Param("gameId") UUID gameId,
            @Param("modelName") String modelName,
            @Param("modelVersion") String modelVersion,
            @Param("embedding") String embedding,
            @Param("resultLimit") int resultLimit);
}
