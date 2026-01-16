package com.jspcs.pos.exception.model;

public class EntityNotFoundException extends BusinessException {
    public EntityNotFoundException(String message) {
        super(message, "ENTITY_NOT_FOUND");
    }
}
