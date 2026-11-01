package br.com.winclub;

import static org.junit.jupiter.api.Assertions.*;

import br.com.winclub.security.PiiCipher;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class PiiCipherTest {
  @Test
  void authenticatedEncryptionUsesFreshNonceAndRejectsTampering() {
    var cipher = new PiiCipher(Base64.getEncoder().encodeToString(new byte[32]));
    String first = cipher.encrypt("52998224725"), second = cipher.encrypt("52998224725");
    assertNotEquals(first, second);
    assertFalse(first.contains("52998224725"));
    assertEquals("52998224725", cipher.decrypt(first));
    String corrupted = first.substring(0, first.length() - 4) + "AAAA";
    assertThrows(IllegalStateException.class, () -> cipher.decrypt(corrupted));
  }

  @Test
  void requires256BitKey() {
    assertThrows(
        IllegalStateException.class,
        () -> new PiiCipher(Base64.getEncoder().encodeToString(new byte[16])));
  }
}
