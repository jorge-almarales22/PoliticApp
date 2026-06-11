package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Cargar variables de entorno desde el archivo .env
	if err := godotenv.Load(); err != nil {
		log.Println("Aviso: No se encontró el archivo .env, usando variables de entorno globales")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Error crítico: La variable DATABASE_URL no está definida en el entorno")
	}

	// 2. Inicializar el Pool de Conexiones a PostgreSQL
	ctx := context.Background()
	dbPool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("No se pudo configurar el pool de conexiones: %v\n", err)
	}
	// Nos aseguramos de cerrar el pool de conexiones de forma limpia cuando la app se apague
	defer dbPool.Close()

	// Validar la conexión real enviando un Ping al contenedor de Docker
	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("Error: No hay conexión real con la base de datos en Docker: %v\n", err)
	}
	log.Println("¡Conexión exitosa a PostgreSQL (PostGIS) en Docker!")

	// 3. Inicializar el Router de Gin
	router := gin.Default()

	// Endpoint básico de Health Check para pruebas iniciales
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":   "up",
			"database": "connected",
			"message":  "SaaS Político - API Gateway corriendo perfectamente",
		})
	})

	// 4. Encender el Servidor HTTP
	log.Printf("Iniciando servidor en el puerto %s...\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Error al levantar el servidor de Gin: %v\n", err)
	}
}