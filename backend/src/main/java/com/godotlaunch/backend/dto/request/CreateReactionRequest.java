package com.godotlaunch.backend.dto.request;

import com.godotlaunch.backend.entity.enums.ReactionType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateReactionRequest {

    @NotNull(message = "Reaction type cannot be null.")
    private ReactionType reactionType;
}
