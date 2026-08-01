package com.godotlaunch.backend.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class CodeEmbeddingResult {
    private List<Float> embedding;
    private String modelName;
    private String modelVersion;
    private Integer dimensions;
    private Integer sampledFiles;
    private Integer sampledChunks;
}
