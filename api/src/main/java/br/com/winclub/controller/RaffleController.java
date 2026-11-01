package br.com.winclub.controller;

import static br.com.winclub.service.Views.page;

import br.com.winclub.dto.Requests.*;
import br.com.winclub.service.RaffleService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class RaffleController {
  private final RaffleService raffles;

  public RaffleController(RaffleService raffles) {
    this.raffles = raffles;
  }

  @GetMapping("/raffles")
  public Object listPublic() {
    return raffles.all().stream()
        .filter(r -> !r.status.equals("DRAFT"))
        .map(r -> raffles.view(r, false))
        .toList();
  }

  @GetMapping("/raffles/{slug}")
  public Object detail(@PathVariable String slug) {
    return raffles.view(raffles.slug(slug), false);
  }

  @GetMapping("/raffles/{slug}/numbers")
  public Object numbers(
      @PathVariable String slug,
      @RequestParam(defaultValue = "0") int from,
      @RequestParam(defaultValue = "100") int size) {
    return raffles.numbers(slug, from, size);
  }

  @GetMapping("/admin/raffles")
  public Object list(
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "") String q) {
    return page(
        raffles.all().stream()
            .filter(r -> status == null || r.status.equals(status))
            .filter(r -> r.title.toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT)))
            .map(r -> raffles.view(r, true))
            .toList(),
        page,
        pageSize);
  }

  @PostMapping("/admin/raffles")
  @ResponseStatus(HttpStatus.CREATED)
  public Object create(@Valid @RequestBody RaffleInput input) {
    return raffles.view(raffles.create(input), true);
  }

  @GetMapping("/admin/raffles/{id}")
  public Object get(@PathVariable String id) {
    return raffles.view(raffles.get(id), true);
  }

  @PatchMapping("/admin/raffles/{id}")
  public Object update(@PathVariable String id, @RequestBody Map<String, Object> patch) {
    return raffles.view(raffles.update(id, patch), true);
  }

  @DeleteMapping("/admin/raffles/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String id) {
    raffles.delete(id);
  }

  @PostMapping("/admin/raffles/{id}/{action:publish|pause|resume|close}")
  public Object transition(@PathVariable String id, @PathVariable String action) {
    return raffles.view(raffles.transition(id, action), true);
  }

  @PutMapping("/admin/raffles/{id}/packages")
  public Object packages(@PathVariable String id, @Valid @RequestBody Packages input) {
    return raffles.view(raffles.packages(id, input), true);
  }

  @PutMapping("/admin/raffles/{id}/featured")
  public Object featured(@PathVariable String id, @RequestBody Featured input) {
    return raffles.view(raffles.featured(id, input.featured()), true);
  }

  @PostMapping("/admin/raffles/{id}/cover")
  public Object cover(@PathVariable String id, @RequestParam("file") MultipartFile file) {
    return raffles.view(raffles.cover(id, file), true);
  }

  @PostMapping("/admin/raffles/{id}/prizes")
  @ResponseStatus(HttpStatus.CREATED)
  public Object prize(@PathVariable String id, @Valid @RequestBody PrizeInput input) {
    return raffles.view(raffles.prize(id, null, input, false), true);
  }

  @PatchMapping("/admin/prizes/{id}")
  public Object updatePrize(@PathVariable String id, @RequestBody Map<String, Object> input) {
    return raffles.view(raffles.patchPrize(id, input), true);
  }

  @DeleteMapping("/admin/prizes/{id}")
  public Object deletePrize(@PathVariable String id) {
    return raffles.view(raffles.prize(null, id, null, true), true);
  }

  @PostMapping("/admin/prizes/{id}/images")
  public Object image(@PathVariable String id, @RequestParam("file") MultipartFile file) {
    return raffles.view(raffles.image(id, file, false), true);
  }

  @DeleteMapping("/admin/prize-images/{id}")
  public Object deleteImage(@PathVariable String id) {
    return raffles.view(raffles.image(id, null, true), true);
  }
}
