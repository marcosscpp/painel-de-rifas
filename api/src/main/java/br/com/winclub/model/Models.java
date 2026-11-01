package br.com.winclub.model;

import java.time.Instant;
import java.util.*;

public final class Models {
  private Models() {}

  public static class Raffle {
    public String id = UUID.randomUUID().toString(), slug, title, description, rules = "";
    public String status = "DRAFT", saleMode = "QUANTITY", coverKey;
    public int totalNumbers, priceCents, minPerOrder = 1, maxPerOrder = 1000;
    public boolean featured;
    public Instant startsAt, endsAt, drawDate, publishedAt, drawnAt, createdAt = Instant.now();
    public List<Package> packages = new ArrayList<>();
    public List<Prize> prizes = new ArrayList<>();
    public Map<String, Object> result;
  }

  public static class Package {
    public String id = UUID.randomUUID().toString();
    public int quantity, position;
    public boolean highlighted;
  }

  public static class Prize {
    public String id = UUID.randomUUID().toString(), title, description = "", kind = "ITEM";
    public int position = 1;
    public Long valueCents;
    public List<Image> images = new ArrayList<>();
  }

  public static class Image {
    public String id = UUID.randomUUID().toString(), key;
    public int position;
  }

  public static class Buyer {
    public String id = UUID.randomUUID().toString(),
        name,
        socialName,
        phone,
        cpf,
        email,
        birthDate,
        gatewayCustomerId;
    public Map<String, String> address;
    public Instant createdAt = Instant.now();
  }

  public static class Order {
    public String id = UUID.randomUUID().toString(),
        raffleId,
        userId,
        idempotencyKey,
        status = "PENDING";
    public List<Integer> numbers = new ArrayList<>();
    public int quantity;
    public long subtotalCents, feeCents, totalCents;
    public boolean refundRequired;
    public Instant createdAt = Instant.now(), expiresAt, paidAt, refundedAt;
    public Payment payment;
  }

  public static class Payment {
    public String provider, providerChargeId, status = "PENDING", pixCopyPaste, pixQrCodeBase64;
    public Instant confirmedAt;
    public long amountCents;
  }

  public static class Settings {
    public String siteName = "WinClub",
        supportWhatsapp = "",
        whatsappGroupUrl = "",
        instagramUrl = "";
    public int pixFeeCents = 199, reservationMinutes = 15, minBuyerAge = 18;
  }
}
