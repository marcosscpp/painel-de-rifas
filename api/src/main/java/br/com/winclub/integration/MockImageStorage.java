package br.com.winclub.integration;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
@Profile("mock & !real")
public class MockImageStorage implements ImageStorage {
  private final Map<String, byte[]> files = new ConcurrentHashMap<>();

  public String upload(MultipartFile file) {
    try {
      byte[] data = file.getBytes();
      ImageValidation.validate(data);
      String key = UUID.randomUUID().toString();
      files.put(key, data);
      return key;
    } catch (java.io.IOException ex) {
      throw new IllegalArgumentException("Imagem inválida");
    }
  }

  public Map<String, String> urls(String key) {
    return key == null
        ? null
        : Map.of("thumb", "/api/mock/images/" + key, "full", "/api/mock/images/" + key);
  }

  public byte[] get(String key) {
    return files.get(key);
  }
}
