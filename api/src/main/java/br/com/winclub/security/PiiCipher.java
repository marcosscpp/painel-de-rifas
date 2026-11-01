package br.com.winclub.security;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("real & !mock")
public class PiiCipher {
  private final byte[] key;

  public PiiCipher(@Value("${app.pii-key}") String encoded) {
    key = Base64.getDecoder().decode(encoded);
    if (key.length != 32)
      throw new IllegalStateException("PII_ENCRYPTION_KEY deve conter 32 bytes em Base64");
  }

  public String encrypt(String plain) {
    try {
      byte[] iv = new byte[12];
      new SecureRandom().nextBytes(iv);
      var cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(
          Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
      return Base64.getEncoder().encodeToString(iv)
          + "."
          + Base64.getEncoder()
              .encodeToString(cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException("Falha ao cifrar cadastro", ex);
    }
  }

  public String decrypt(String value) {
    try {
      String[] parts = value.split("\\.");
      var cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(
          Cipher.DECRYPT_MODE,
          new SecretKeySpec(key, "AES"),
          new GCMParameterSpec(128, Base64.getDecoder().decode(parts[0])));
      return new String(
          cipher.doFinal(Base64.getDecoder().decode(parts[1])), StandardCharsets.UTF_8);
    } catch (Exception ex) {
      throw new IllegalStateException("Falha ao decifrar cadastro", ex);
    }
  }
}
