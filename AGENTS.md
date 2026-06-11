# AGENTS.md — PoliticApp

## Project overview

Spanish-first political SaaS, multi-tenant. Two components:
- **PostgreSQL + PostGIS** container (Docker Compose at repo root)
- **Go backend** in `politic-backend/` (Gin + pgx v5)

The backend is in early bootstrap: only `/health` endpoint exists. `internal/` and `pkg/` subdirectories are scaffolded but empty.

## Module layout

```
./docker-compose.yml          ← postgres container (postgis/postgis:16-3.4)
./init.sql                    ← runs ONCE on first container startup
./postgres_data/              ← mounted volume — NEVER commit this
./politic-backend/            ← Go module (module politic-backend, go 1.26.4)
  cmd/api/main.go             ← entrypoint
  internal/campaign/          ← empty (future domain)
  internal/scrutiny/          ← empty
  internal/user/              ← empty
  internal/voter/             ← empty
  pkg/database/               ← empty
  pkg/middleware/             ← empty
```

## Environment & config

`.env` in `politic-backend/`:
```
PORT=8080
DATABASE_URL=postgres://admin_politic:UnPasswordSeguro2026@localhost:5432/politic_db?sslmode=disable
JWT_SECRET=CambiaEstoPorUnHashUltraSecretoEnProduccion2026
```

- `godotenv` loads `.env` at startup. App fatals if `DATABASE_URL` is missing.
- Default port: `8080`.

## Commands

All Go commands run from `politic-backend/`:

```powershell
# Database (from repo root)
docker compose up -d          # start postgres
docker compose down           # stop postgres
Remove-Item -Recurse -Force .\postgres_data   # nuke DB volume (re-runs init.sql on next up)

# Backend (from politic-backend/)
go run ./cmd/api/             # start server
go build ./cmd/api/           # compile
go test ./...                 # run tests (none exist yet)
go vet ./...                  # static analysis
```

## Gotchas

- **`init.sql` only executes when `postgres_data/` is empty.** Schema changes require deleting the volume and re-creating the container.
- **Hostname differs by context:** use `localhost` from the host (DBeaver, go run) but `postgres` (service name) from inside Docker when the Go backend is containerized on `politic_network`.
- **`go.mod` includes two DB drivers:** `pgx/v5` (PostgreSQL, used) and `mongo-driver/v2` (MongoDB, not yet used). Don't remove it without checking — it may be planned for future use.
- **No Makefile, no lint config, no CI.** Only raw `go` toolchain commands exist.
- **Convention: all comments and log messages are in Spanish.** Keep new code consistent.
- **`postgres_data/` and `.git/` should be in `.gitignore`** if not already.
