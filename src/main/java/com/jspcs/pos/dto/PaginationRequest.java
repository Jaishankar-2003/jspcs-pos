package com.jspcs.pos.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginationRequest {
    
    @Min(value = 0, message = "Page must be 0 or greater")
    @lombok.Builder.Default
    private int page = 0;
    
    @Min(value = 1, message = "Size must be at least 1")
    @Max(value = 100, message = "Size must not exceed 100")
    @lombok.Builder.Default
    private int size = 20;
    
    private String sortBy;
    
    @lombok.Builder.Default
    private String sortDir = "asc";
    
    public int getOffset() {
        return page * size;
    }
    
    public String getSortClause() {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return "id";
        }
        return sortBy + " " + (sortDir != null ? sortDir.toUpperCase() : "ASC");
    }
}
