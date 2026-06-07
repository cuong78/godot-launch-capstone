# Backend Development Rules

## Tech Stack
- Java 21+
- Spring Boot 4.x
- Spring Data JPA + Hibernate
- PostgreSQL 17
- Lombok

---

## Project Structure

```
src/main/java/com/godotlaunch/backend/
├── controller/
├── service/
│   └── impl/
├── repository/
├── entity/
│   └── enums/
├── dto/
│   ├── request/
│   └── response/
└── exception/
```

---

## Dependency Injection — Spring Boot Official Standard

Following the [Spring Boot official documentation](https://docs.spring.io/spring-boot/reference/using/spring-beans-and-dependency-injection.html):

> "We generally recommend using constructor injection to wire up dependencies."

### Rules
- Always use **constructor injection** — never field injection (`@Autowired` on field)
- If a class has **1 constructor**, Spring auto-injects without `@Autowired`
- Use `@RequiredArgsConstructor` (Lombok) to generate the constructor — equivalent to writing it manually
- Always inject the **interface**, never the implementation class

```java
// ✅ Correct — Lombok generates constructor, Spring auto-injects
@Service
@RequiredArgsConstructor
public class GameServiceImpl implements GameService {
    private final GameRepository gameRepository; // interface
}

// ❌ Wrong — field injection
@Service
public class GameServiceImpl implements GameService {
    @Autowired
    private GameRepository gameRepository;
}

// ❌ Wrong — inject implementation class
@RestController
@RequiredArgsConstructor
public class GameController {
    private final GameServiceImpl gameService; // never inject impl
}
```

---

## Mandatory Layers — Every API Must Have All 4 Layers

### 1. Repository
- Extends `JpaRepository<Entity, UUID>`
- Annotated with `@Repository`
- Contains query methods only — no business logic
- Method names must match **entity field names**, not column names
- Naming convention: `{Entity}Repository`

```java
@Repository
public interface GameRepository extends JpaRepository<Game, UUID> {
    List<Game> findByCreatorId(UUID creatorId);
    List<Game> findByStatus(GameStatus status);
}
```

---

### 2. Service Interface
- Located in `service/` package
- Declares method signatures only — no implementation, no annotations
- Naming convention: `{Entity}Service`

```java
public interface GameService {
    GameResponse getById(UUID id);
    List<GameResponse> getAll();
    GameResponse create(CreateGameRequest request);
    GameResponse update(UUID id, UpdateGameRequest request);
    void delete(UUID id);
}
```

---

### 3. Service Implementation
- Located in `service/impl/` package
- Annotated with `@Service`
- Implements the Service interface
- Uses `@RequiredArgsConstructor` for constructor injection
- Contains all business logic
- Naming convention: `{Entity}ServiceImpl`

```java
@Service
@RequiredArgsConstructor
public class GameServiceImpl implements GameService {

    private final GameRepository gameRepository;

    @Override
    public GameResponse getById(UUID id) {
        Game game = gameRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Game not found"));
        return mapToResponse(game);
    }
}
```

---

### 4. Controller
- Annotated with `@RestController` and `@RequestMapping("/api/v1/...")`
- Uses `@RequiredArgsConstructor` for constructor injection
- Injects **Service interface** — never the Impl class
- No business logic — delegates everything to Service
- Naming convention: `{Entity}Controller`

```java
@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService; // interface, not GameServiceImpl

    @GetMapping("/{id}")
    public ResponseEntity<GameResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(gameService.getById(id));
    }

    @PostMapping
    public ResponseEntity<GameResponse> create(@RequestBody @Valid CreateGameRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gameService.create(request));
    }
}
```

---

## DTO Rules
- Never expose raw entities in API responses — always use DTOs
- `request/` — input from client: `Create{Entity}Request`, `Update{Entity}Request`
- `response/` — output to client: `{Entity}Response`
- Use `@Valid` on `@RequestBody` in controller
- Use Lombok: `@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`

```java
// Request DTO
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateGameRequest {
    @NotBlank
    private String title;

    @NotNull
    private PublishingType publishingType;
}

// Response DTO
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameResponse {
    private UUID id;
    private String title;
    private GameStatus status;
    private Instant createdAt;
}
```

---

## Entity Rules
- Must match PostgreSQL schema exactly — column names, types, nullability
- Use `@Column(name = "...")` explicitly for every field
- UUID primary key: `@GeneratedValue(strategy = GenerationType.UUID)`
- Timestamps managed by DB: `insertable = false, updatable = false`
- PostgreSQL custom enums: `@JdbcTypeCode(SqlTypes.NAMED_ENUM)`
- Never expose entities directly in API responses

---

## API Response Format
All endpoints must return a consistent response wrapper:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

---

## Checklist Before Implementing Any API

- [ ] Repository created — query method names match entity field names
- [ ] Service **interface** created in `service/`
- [ ] Service **impl** created in `service/impl/` — annotated with `@Service`
- [ ] Controller injects **interface**, not impl
- [ ] `@RequiredArgsConstructor` used — no `@Autowired` on fields
- [ ] Request DTO with `@Valid` annotations
- [ ] Response DTO — no raw entity returned
- [ ] No business logic in Controller
- [ ] No query logic in ServiceImpl — delegate to Repository
