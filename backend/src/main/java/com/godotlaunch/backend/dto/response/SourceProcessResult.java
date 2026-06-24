package com.godotlaunch.backend.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

/**
 * Kết quả Python /source/process trả về sau khi clone + scan + snapshot repo.
 */
@Getter
@Setter
public class SourceProcessResult {
    private boolean clean;            // virus scan sạch
    private boolean scanned;          // ClamAV có chạy không
    private String commitSha;
    private String bundleHash;
    private int fileCount;
    private boolean isGodotProject;
    private List<Map<String, Object>> infected;
    private List<Map<String, Object>> secrets;
    private Map<String, String> fileHashes;
}
