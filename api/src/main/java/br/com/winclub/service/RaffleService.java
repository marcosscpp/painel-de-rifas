package br.com.winclub.service;

import static br.com.winclub.service.Views.*;

import br.com.winclub.dto.Requests.*;
import br.com.winclub.integration.ImageStorage;
import br.com.winclub.model.Models.*;
import br.com.winclub.repository.DocumentRepository;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class RaffleService {
  private final DocumentRepository db;
  private final ImageStorage images;
  private final JsonMapper json;
  private final jakarta.validation.Validator validator;

  public RaffleService(
      DocumentRepository db,
      ImageStorage images,
      JsonMapper json,
      jakarta.validation.Validator validator) {
    this.db = db;
    this.images = images;
    this.json = json;
    this.validator = validator;
  }

  public List<Raffle> all() {
    return db.list("raffle", Raffle.class).stream()
        .sorted(Comparator.comparing((Raffle r) -> r.createdAt).reversed())
        .toList();
  }

  public Raffle get(String id) {
    return db.find("raffle", id, Raffle.class)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rifa não encontrada"));
  }

  public Raffle slug(String slug) {
    return all().stream()
        .filter(r -> r.slug.equals(slug) && !r.status.equals("DRAFT"))
        .findFirst()
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rifa não encontrada"));
  }

  public Raffle create(RaffleInput input) {
    return db.transaction(
        () -> {
          String slug = slugOf(input);
          if (all().stream().anyMatch(r -> r.slug.equals(slug)))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug já utilizado");
          Raffle r = new Raffle();
          apply(r, input);
          save(r);
          return r;
        });
  }

  private void apply(Raffle r, RaffleInput i) {
    r.slug = slugOf(i);
    r.title = i.title();
    r.description = i.description();
    if (i.rules() != null) r.rules = i.rules();
    if (i.saleMode() != null) r.saleMode = i.saleMode();
    r.totalNumbers = i.totalNumbers();
    r.priceCents = i.priceCents();
    if (i.minPerOrder() != null) r.minPerOrder = i.minPerOrder();
    if (i.maxPerOrder() != null) r.maxPerOrder = i.maxPerOrder();
    if (r.minPerOrder > r.maxPerOrder || r.minPerOrder > r.totalNumbers)
      throw new IllegalArgumentException("Limites inválidos");
    r.startsAt = i.startsAt();
    r.endsAt = i.endsAt();
    r.drawDate = i.drawDate();
    if (r.startsAt != null && r.endsAt != null && !r.endsAt.isAfter(r.startsAt))
      throw new IllegalArgumentException("Período inválido");
  }

  public Raffle update(String id, Map<String, Object> patch) {
    return db.transaction(
        () -> {
          Raffle r = get(id);
          Set<String> allowed =
              Set.of(
                  "slug",
                  "title",
                  "description",
                  "rules",
                  "saleMode",
                  "totalNumbers",
                  "priceCents",
                  "minPerOrder",
                  "maxPerOrder",
                  "startsAt",
                  "endsAt",
                  "drawDate");
          if (!allowed.containsAll(patch.keySet()))
            throw new IllegalArgumentException("Campo desconhecido");
          if (!r.status.equals("DRAFT"))
            for (String field : Set.of("slug", "saleMode", "totalNumbers", "priceCents")) {
              try {
                if (patch.containsKey(field)
                    && !Objects.equals(patch.get(field), Raffle.class.getField(field).get(r)))
                  throw new ResponseStatusException(
                      HttpStatus.CONFLICT, "Estrutura da rifa publicada é imutável");
              } catch (ReflectiveOperationException ex) {
                throw new IllegalStateException(ex);
              }
            }
          var values = new LinkedHashMap<String, Object>();
          for (String field : allowed) {
            try {
              values.put(field, Raffle.class.getField(field).get(r));
            } catch (ReflectiveOperationException ex) {
              throw new IllegalStateException(ex);
            }
          }
          values.putAll(patch);
          RaffleInput input = json.convertValue(values, RaffleInput.class);
          validate(input);
          if (all().stream().anyMatch(o -> !o.id.equals(id) && o.slug.equals(input.slug())))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug já utilizado");
          apply(r, input);
          save(r);
          return r;
        });
  }

  private String slugOf(RaffleInput input) {
    if (input.slug() != null) return input.slug();
    String slug =
        java.text.Normalizer.normalize(input.title(), java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
    if (slug.isBlank()) throw new IllegalArgumentException("Título inválido");
    return slug.substring(0, Math.min(80, slug.length()));
  }

  private void validate(Object input) {
    if (!validator.validate(input).isEmpty()) throw new IllegalArgumentException("Dados inválidos");
  }

  public void save(Raffle r) {
    db.save("raffle", r.id, r);
  }

  public void delete(String id) {
    db.transaction(
        () -> {
          Raffle r = get(id);
          if (!r.status.equals("DRAFT"))
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Só rascunhos podem ser apagados");
          db.delete("raffle", id);
          return null;
        });
  }

  public Raffle transition(String id, String action) {
    return db.transaction(
        () -> {
          Raffle r = get(id);
          String next =
              switch (action) {
                case "publish" -> r.status.equals("DRAFT") ? "ACTIVE" : null;
                case "pause" -> r.status.equals("ACTIVE") ? "PAUSED" : null;
                case "resume" -> r.status.equals("PAUSED") ? "ACTIVE" : null;
                case "close" -> Set.of("ACTIVE", "PAUSED").contains(r.status) ? "CLOSED" : null;
                default -> null;
              };
          if (next == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transição inválida");
          if (action.equals("publish")) {
            if (r.prizes.isEmpty())
              throw new ResponseStatusException(HttpStatus.CONFLICT, "Cadastre um prêmio");
            r.publishedAt = Instant.now();
          }
          r.status = next;
          save(r);
          return r;
        });
  }

  public Raffle packages(String id, Packages input) {
    return db.transaction(
        () -> {
          Raffle r = get(id);
          var seen = new HashSet<Integer>();
          r.packages.clear();
          for (var p : input.items()) {
            if (p.quantity() < r.minPerOrder
                || p.quantity() > r.maxPerOrder
                || !seen.add(p.quantity())) throw new IllegalArgumentException("Pacote inválido");
            var out = new br.com.winclub.model.Models.Package();
            out.quantity = p.quantity();
            out.position = p.position();
            out.highlighted = p.highlighted();
            r.packages.add(out);
          }
          save(r);
          return r;
        });
  }

  public Raffle featured(String id, boolean flag) {
    return db.transaction(
        () -> {
          Raffle r = get(id);
          if (flag)
            for (Raffle other : all()) {
              if (other.featured) {
                other.featured = false;
                save(other);
              }
            }
          r.featured = flag;
          save(r);
          return r;
        });
  }

  public Raffle cover(String id, MultipartFile file) {
    return db.transaction(
        () -> {
          Raffle r = get(id);
          r.coverKey = images.upload(file);
          save(r);
          return r;
        });
  }

  public Raffle prize(String raffleId, String prizeId, PrizeInput input, boolean remove) {
    return db.transaction(
        () -> {
          Raffle r = raffleId == null ? owner(prizeId, false) : get(raffleId);
          if (r.status.equals("DRAWN"))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sorteio publicado");
          Prize p =
              prizeId == null
                  ? new Prize()
                  : r.prizes.stream().filter(x -> x.id.equals(prizeId)).findFirst().orElseThrow();
          if (remove) r.prizes.remove(p);
          else {
            if (prizeId == null) r.prizes.add(p);
            p.title = input.title();
            if (input.description() != null) p.description = input.description();
            if (input.kind() != null) p.kind = input.kind();
            if (input.position() != null) p.position = input.position();
            p.valueCents = input.valueCents();
          }
          save(r);
          return r;
        });
  }

  public Raffle patchPrize(String id, Map<String, Object> patch) {
    return db.transaction(
        () -> {
          Raffle r = owner(id, false);
          Prize p = r.prizes.stream().filter(x -> x.id.equals(id)).findFirst().orElseThrow();
          var values =
              map(
                  "title",
                  p.title,
                  "description",
                  p.description,
                  "kind",
                  p.kind,
                  "position",
                  p.position,
                  "valueCents",
                  p.valueCents);
          if (!values.keySet().containsAll(patch.keySet()))
            throw new IllegalArgumentException("Campo desconhecido");
          values.putAll(patch);
          PrizeInput input = json.convertValue(values, PrizeInput.class);
          validate(input);
          return prize(null, id, input, false);
        });
  }

  private Raffle owner(String id, boolean image) {
    return all().stream()
        .filter(
            r ->
                r.prizes.stream()
                    .anyMatch(
                        p ->
                            image
                                ? p.images.stream().anyMatch(i -> i.id.equals(id))
                                : p.id.equals(id)))
        .findFirst()
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prêmio não encontrado"));
  }

  public Raffle image(String id, MultipartFile file, boolean remove) {
    return db.transaction(
        () -> {
          Raffle r = owner(id, remove);
          if (r.status.equals("DRAWN"))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sorteio publicado");
          for (Prize p : r.prizes) {
            if (remove) p.images.removeIf(i -> i.id.equals(id));
            else if (p.id.equals(id)) {
              Image image = new Image();
              image.key = images.upload(file);
              image.position = p.images.size();
              p.images.add(image);
            }
          }
          save(r);
          return r;
        });
  }

  public Map<String, Object> progress(Raffle r) {
    var orders =
        db.list("order", Order.class).stream()
            .filter(o -> o.raffleId.equals(r.id) && !o.refundRequired)
            .toList();
    int paid = orders.stream().filter(o -> o.status.equals("PAID")).mapToInt(o -> o.quantity).sum();
    int reserved =
        orders.stream()
            .filter(o -> o.status.equals("PENDING") && o.expiresAt.isAfter(Instant.now()))
            .mapToInt(o -> o.quantity)
            .sum();
    return map(
        "paid",
        paid,
        "reserved",
        reserved,
        "available",
        r.totalNumbers - paid - reserved,
        "percent",
        Math.floor(paid * 1000.0 / r.totalNumbers) / 10);
  }

  public Map<String, Object> view(Raffle r, boolean admin) {
    var out =
        map(
            "id",
            r.id,
            "slug",
            r.slug,
            "title",
            r.title,
            "description",
            r.description,
            "rules",
            r.rules,
            "status",
            r.status,
            "saleMode",
            r.saleMode,
            "featured",
            r.featured,
            "priceCents",
            r.priceCents,
            "totalNumbers",
            r.totalNumbers,
            "minPerOrder",
            r.minPerOrder,
            "maxPerOrder",
            r.maxPerOrder,
            "startsAt",
            r.startsAt,
            "endsAt",
            r.endsAt,
            "drawDate",
            r.drawDate,
            "createdAt",
            r.createdAt,
            "publishedAt",
            r.publishedAt,
            "cover",
            images.urls(r.coverKey),
            "progress",
            progress(r),
            "mainPrize",
            r.prizes.isEmpty() ? null : r.prizes.getFirst().title,
            "result",
            r.result);
    out.put(
        "packages",
        r.packages.stream()
            .sorted(Comparator.comparingInt(p -> p.position))
            .map(
                p ->
                    map(
                        "id",
                        p.id,
                        "quantity",
                        p.quantity,
                        "position",
                        p.position,
                        "highlighted",
                        p.highlighted,
                        "totalCents",
                        (long) p.quantity * r.priceCents))
            .toList());
    out.put(
        "prizes",
        r.prizes.stream()
            .sorted(Comparator.comparingInt(p -> p.position))
            .map(
                p ->
                    map(
                        "id",
                        p.id,
                        "position",
                        p.position,
                        "title",
                        p.title,
                        "description",
                        p.description,
                        "kind",
                        p.kind,
                        "valueCents",
                        p.valueCents,
                        "images",
                        p.images.stream()
                            .map(
                                i -> {
                                  var v = new LinkedHashMap<String, Object>();
                                  v.putAll(images.urls(i.key));
                                  if (admin) {
                                    v.put("id", i.id);
                                    v.put("position", i.position);
                                  }
                                  return v;
                                })
                            .toList()))
            .toList());
    if (!admin) out.remove("id");
    return out;
  }

  public Map<String, Object> numbers(String slug, int from, int size) {
    Raffle r = slug(slug);
    if (from < 0 || size < 1 || size > 1000) throw new IllegalArgumentException("Faixa inválida");
    Map<Integer, String> occupied = new HashMap<>();
    for (Order o : db.list("order", Order.class))
      if (o.raffleId.equals(r.id)
          && !o.refundRequired
          && (o.status.equals("PAID")
              || o.status.equals("PENDING") && o.expiresAt.isAfter(Instant.now())))
        for (int n : o.numbers) occupied.put(n, o.status.equals("PAID") ? "PAID" : "RESERVED");
    var rows = new ArrayList<>();
    for (int n = from; n < Math.min((long) from + size, r.totalNumbers); n++)
      rows.add(map("number", n, "status", occupied.getOrDefault(n, "AVAILABLE")));
    var statuses = new StringBuilder();
    for (int n = from; n < Math.min((long) from + size, r.totalNumbers); n++)
      statuses.append(
          switch (occupied.getOrDefault(n, "AVAILABLE")) {
            case "PAID" -> '2';
            case "RESERVED" -> '1';
            default -> '0';
          });
    return map(
        "from",
        from,
        "size",
        Math.min(size, Math.max(0, r.totalNumbers - from)),
        "total",
        r.totalNumbers,
        "statuses",
        statuses.toString());
  }
}
