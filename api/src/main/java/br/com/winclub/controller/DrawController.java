package br.com.winclub.controller;

import br.com.winclub.dto.Requests.Draw;
import br.com.winclub.service.DrawService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/raffles/{id}/draw")
public class DrawController {
  private final DrawService draws;

  public DrawController(DrawService draws) {
    this.draws = draws;
  }

  @PostMapping("/preview")
  public Object preview(@PathVariable String id, @Valid @RequestBody Draw input) {
    return draws.draw(id, input, false);
  }

  @PostMapping
  public Object publish(@PathVariable String id, @Valid @RequestBody Draw input) {
    return draws.draw(id, input, true);
  }
}
