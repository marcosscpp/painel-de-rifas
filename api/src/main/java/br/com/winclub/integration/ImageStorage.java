package br.com.winclub.integration;

import java.util.Map;
import org.springframework.web.multipart.MultipartFile;

public interface ImageStorage {
  String upload(MultipartFile file);

  Map<String, String> urls(String key);
}
