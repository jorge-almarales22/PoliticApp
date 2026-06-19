CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'analyst', 'viewer');

-- ============================================================
-- TABLAS PRINCIPALES
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL,
    full_name     VARCHAR(255)        NOT NULL,
    role          user_role           NOT NULL DEFAULT 'viewer',
    campaign_id   UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    full_name   VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(50),
    photo_url   TEXT,
    is_main     BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_campaign ON candidates (campaign_id);

-- ============================================================
-- VOTANTES (PostGIS)
-- ============================================================

CREATE TABLE IF NOT EXISTS voters (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name   VARCHAR(255)        NOT NULL,
    dni         VARCHAR(50),
    address     TEXT,
    phone       VARCHAR(50),
    email       VARCHAR(255),
    location    GEOMETRY(Point, 4326),
    leader_id   UUID,
    tags        TEXT[],
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voters_location ON voters USING GIST (location);

-- ============================================================
-- ESCRUTINIO
-- ============================================================

CREATE TABLE IF NOT EXISTS scrutiny_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id     UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    witness_id      UUID         NOT NULL,
    voting_place    VARCHAR(255) NOT NULL,
    table_number    INTEGER      NOT NULL,
    zone            VARCHAR(100),
    votos_blanco    INTEGER      NOT NULL DEFAULT 0,
    votos_nulos     INTEGER      NOT NULL DEFAULT 0,
    candidate_votes JSONB        NOT NULL DEFAULT '[]'::jsonb,
    e14_image_url   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrutiny_reports_campaign ON scrutiny_reports (campaign_id, created_at DESC);

-- ============================================================
-- LOGISTICA: Conductores
-- ============================================================

CREATE TABLE IF NOT EXISTS drivers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(255) NOT NULL,
    dni             VARCHAR(50)  NOT NULL,
    address         TEXT,
    blood_type      VARCHAR(10),
    license_pdf_url TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOGISTICA: Vehiculos
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id           UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    plate                 VARCHAR(20)  NOT NULL,
    model                 VARCHAR(100),
    driver_id             UUID,
    driver_name           VARCHAR(255),
    driver_phone          VARCHAR(50),
    status                VARCHAR(50)  NOT NULL DEFAULT 'DISPONIBLE',
    image_url             TEXT,
    soat_pdf_url          TEXT,
    tecnomecanica_pdf_url TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_campaign ON vehicles (campaign_id);

-- ============================================================
-- LOGISTICA: Inventario
-- ============================================================

CREATE TABLE IF NOT EXISTS logistics_inventory (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id   UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    item_name     VARCHAR(255) NOT NULL,
    item_type     VARCHAR(50)  NOT NULL,
    total_qty     INTEGER      NOT NULL,
    allocated_qty INTEGER      NOT NULL DEFAULT 0,
    image_url     TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOGISTICA: Despachos
-- ============================================================

CREATE TABLE IF NOT EXISTS logistics_dispatches (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id   UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    inventory_id  UUID         NOT NULL REFERENCES logistics_inventory(id) ON DELETE CASCADE,
    receiver_id   UUID         NOT NULL,
    vehicle_id    UUID,
    quantity      INTEGER      NOT NULL,
    qr_code_token VARCHAR(255) NOT NULL UNIQUE,
    status        VARCHAR(50)  NOT NULL DEFAULT 'EN_CAMINO',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTORES (PostGIS)
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_sectors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    sector_type VARCHAR(50)  NOT NULL,
    boundary    GEOMETRY(Geometry, 4326) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_sectors_boundary ON campaign_sectors USING GIST (boundary);
