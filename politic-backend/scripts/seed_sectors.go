package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type geojsonCollection struct {
	Type     string    `json:"type"`
	Features []feature `json:"features"`
}

type feature struct {
	Type       string          `json:"type"`
	Properties json.RawMessage `json:"properties"`
	Geometry   json.RawMessage `json:"geometry"`
}

const (
	geojsonPath     = "scripts/data/colombia_sectores.geojson"
	campaignID      = "8f4b23a1-1234-4bc5-9c87-6e5d4c3b2a1a"
	targetMunicipio = "20001"
	sectorType      = "COMUNA"
)

var municipioKeys = []string{
	"mpio_cdpmp", "mpio_ccdgo", "mpio_cdp",
	"MPIO_CDPMP", "MPIO_CCDGO", "MPIO_CDP", "COD_MPIO",
}

var nombreKeys = []string{
	"setu_ccnct", "setu_ccdgo", "setu_na",
	"SETU_CCNCT", "SETU_CCDGO", "SETU_NA", "SETU_CODI",
	"NOMBRE", "NOM_SETU", "nombre", "name", "codigo",
}

func main() {
	log.Println("=== Seed de Sectores GeoJSON (DANE) para Valledupar ===")

	if err := godotenv.Load(); err != nil {
		log.Println("Aviso: No se encontró archivo .env, usando variables de entorno del sistema")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Error crítico: DATABASE_URL no está definida en el entorno")
	}

	log.Println("-> Abriendo archivo GeoJSON:", geojsonPath)
	data, err := os.ReadFile(geojsonPath)
	if err != nil {
		log.Fatalf("Error al leer el archivo GeoJSON: %v", err)
	}

	log.Printf("-> Parseando %d KB de datos GeoJSON...\n", len(data)/1024)
	var collection geojsonCollection
	if err := json.Unmarshal(data, &collection); err != nil {
		log.Fatalf("Error al parsear GeoJSON: %v", err)
	}

	totalFeatures := len(collection.Features)
	log.Printf("-> Total de Features detectados: %d\n", totalFeatures)

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Error al conectar con la base de datos: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Error: No se pudo hacer ping a PostgreSQL: %v", err)
	}
	log.Println("-> Conexión a PostgreSQL exitosa")

	insertados := 0
	ignorados := 0
	for i, feat := range collection.Features {
		props, err := parseProperties(feat.Properties)
		if err != nil {
			log.Printf("  [%d] Advertencia: no se pudieron leer propiedades: %v\n", i, err)
			ignorados++
			continue
		}

		codMpio := extraerMunicipio(props)
		if codMpio != targetMunicipio {
			ignorados++
			continue
		}

		nombre := extraerNombre(props, i)

		if len(feat.Geometry) == 0 || string(feat.Geometry) == "null" {
			log.Printf("  [%d] Advertencia: geometría nula para sector '%s', se omite\n", i, nombre)
			ignorados++
			continue
		}

		geomJSON := string(feat.Geometry)

		err = insertarSector(ctx, pool, campaignID, nombre, geomJSON)
		if err != nil {
			log.Printf("  [%d] Error al insertar sector '%s': %v\n", i, nombre, err)
			ignorados++
			continue
		}

		log.Printf("-> Insertado: Sector %s exitosamente\n", nombre)
		insertados++
	}

	log.Println("================================================")
	log.Printf("Resumen: %d insertados, %d ignorados (de %d total)\n", insertados, ignorados, totalFeatures)
	log.Println("=== Seed finalizado ===")
	if insertados == 0 {
		log.Println("ADVERTENCIA: No se insertó ningún sector. Verifica que el código de municipio sea correcto y que las llaves de propiedades coincidan con las del GeoJSON del DANE.")
	}
}

func parseProperties(raw json.RawMessage) (map[string]interface{}, error) {
	var props map[string]interface{}
	if err := json.Unmarshal(raw, &props); err != nil {
		return nil, err
	}
	return props, nil
}

func extraerMunicipio(props map[string]interface{}) string {
	for _, key := range municipioKeys {
		if val, ok := props[key]; ok {
			cod := fmt.Sprintf("%v", val)
			if cod != "" && cod != "<nil>" {
				return cod
			}
		}
	}
	return ""
}

func extraerNombre(props map[string]interface{}, fallbackIdx int) string {
	for _, key := range nombreKeys {
		if val, ok := props[key]; ok {
			nombre := fmt.Sprintf("%v", val)
			if nombre != "" && nombre != "<nil>" {
				return nombre
			}
		}
	}
	return fmt.Sprintf("SECTOR_%04d", fallbackIdx)
}

func insertarSector(ctx context.Context, pool *pgxpool.Pool, campaignID, nombre, geomJSON string) error {
	query := `
		INSERT INTO campaign_sectors (campaign_id, name, sector_type, boundary)
		VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))`

	_, err := pool.Exec(ctx, query, campaignID, nombre, sectorType, geomJSON)
	return err
}
