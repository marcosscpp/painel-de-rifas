package br.com.winclub.integration;

import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;

final class ImageValidation {
  private ImageValidation() {}

  static void validate(byte[] bytes) {
    if (bytes.length == 0 || bytes.length > 8 * 1024 * 1024)
      throw new IllegalArgumentException("Imagem inválida");
    try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
      var readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) throw new IllegalArgumentException("Envie PNG ou JPEG");
      var reader = readers.next();
      try {
        String format = reader.getFormatName();
        if (!format.equalsIgnoreCase("png") && !format.equalsIgnoreCase("jpeg"))
          throw new IllegalArgumentException("Envie PNG ou JPEG");
        reader.setInput(stream);
        if ((long) reader.getWidth(0) * reader.getHeight(0) > 40_000_000)
          throw new IllegalArgumentException("Imagem muito grande");
      } finally {
        reader.dispose();
      }
    } catch (java.io.IOException ex) {
      throw new IllegalArgumentException("Imagem inválida");
    }
  }
}
