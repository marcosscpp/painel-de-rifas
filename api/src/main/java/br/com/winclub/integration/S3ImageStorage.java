package br.com.winclub.integration;

import java.net.URI;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Component
@Profile("real & !mock")
public class S3ImageStorage implements ImageStorage {
  private final S3Client s3;
  private final String bucket, publicUrl;

  public S3ImageStorage(
      @Value("${app.storage.endpoint}") String endpoint,
      @Value("${app.storage.bucket}") String bucket,
      @Value("${app.storage.public-url}") String url,
      @Value("${app.storage.access-key}") String access,
      @Value("${app.storage.secret-key}") String secret) {
    if (access.isBlank() || secret.isBlank())
      throw new IllegalStateException("Configure credenciais S3");
    this.bucket = bucket;
    publicUrl = url.replaceAll("/$", "");
    s3 =
        S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .region(Region.US_EAST_1)
            .forcePathStyle(true)
            .credentialsProvider(
                StaticCredentialsProvider.create(AwsBasicCredentials.create(access, secret)))
            .build();
  }

  public String upload(MultipartFile file) {
    try {
      byte[] bytes = file.getBytes();
      ImageValidation.validate(bytes);
      String key = "images/" + UUID.randomUUID();
      String content = bytes[0] == (byte) 0x89 ? "image/png" : "image/jpeg";
      s3.putObject(
          b -> b.bucket(bucket).key(key).contentType(content), RequestBody.fromBytes(bytes));
      return key;
    } catch (java.io.IOException ex) {
      throw new IllegalArgumentException("Imagem inválida");
    }
  }

  public Map<String, String> urls(String key) {
    return key == null
        ? null
        : Map.of("thumb", publicUrl + "/" + key, "full", publicUrl + "/" + key);
  }

  @jakarta.annotation.PreDestroy
  public void close() {
    s3.close();
  }
}
