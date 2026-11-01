package br.com.winclub.controller;

import br.com.winclub.integration.MockImageStorage;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("mock & !real")
public class MockImageController {
  private final MockImageStorage images;

  public MockImageController(MockImageStorage images) {
    this.images = images;
  }

  @GetMapping("/api/mock/images/{key}")
  public ResponseEntity<byte[]> get(@PathVariable String key) {
    byte[] bytes = images.get(key);
    if (bytes == null) return ResponseEntity.notFound().build();
    return ResponseEntity.ok()
        .contentType(bytes[0] == (byte) 0x89 ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG)
        .body(bytes);
  }
}
