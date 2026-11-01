package br.com.winclub.controller;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> status(ResponseStatusException ex) {
    return ResponseEntity.status(ex.getStatusCode())
        .body(
            Map.of(
                "statusCode",
                ex.getStatusCode().value(),
                "message",
                ex.getReason() == null ? "Requisição inválida" : ex.getReason()));
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    IllegalArgumentException.class
  })
  ResponseEntity<?> invalid(Exception ex) {
    return ResponseEntity.badRequest()
        .body(Map.of("statusCode", 400, "message", "Dados inválidos"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<?> unexpected(Exception ex) {
    org.slf4j.LoggerFactory.getLogger(ApiErrors.class)
        .error("Falha interna: {}", ex.getClass().getSimpleName());
    return ResponseEntity.internalServerError()
        .body(Map.of("statusCode", 500, "message", "Erro interno"));
  }
}
