package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"politic-backend/internal/geo"
	"politic-backend/internal/logistics"
	"politic-backend/internal/scrutiny"
	"politic-backend/internal/user"
	"politic-backend/internal/voter"
	"politic-backend/pkg/middleware"
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

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("Error crítico: La variable JWT_SECRET no está definida en el entorno")
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

	// 3. Inicializar capas de dominio (Clean Architecture)
	userRepo := user.NewRepository(dbPool)
	userSvc := user.NewService(userRepo)
	userHandler := user.NewHandler(userSvc, jwtSecret)

	voterRepo := voter.NewRepository(dbPool)
	voterSvc := voter.NewService(voterRepo)
	voterHandler := voter.NewHandler(voterSvc)

	scrutinyRepo := scrutiny.NewRepository(dbPool)
	scrutinySvc := scrutiny.NewService(scrutinyRepo)
	scrutinyHandler := scrutiny.NewHandler(scrutinySvc)

	geoRepo := geo.NewRepository(dbPool)
	geoSvc := geo.NewService(geoRepo)
	geoHandler := geo.NewHandler(geoSvc)

	logisticsRepo := logistics.NewRepository(dbPool)
	logisticsSvc := logistics.NewService(logisticsRepo)
	logisticsHandler := logistics.NewHandler(logisticsSvc)

	// 4. Inicializar el Router de Gin y montar rutas
	router := gin.Default()

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":   "up",
			"database": "connected",
			"message":  "SaaS Político - API Gateway corriendo perfectamente",
		})
	})

	// Autenticación (rutas públicas, sin middleware)
	auth := router.Group("/api/v1/auth")
	{
		auth.POST("/register", userHandler.Register)
		auth.POST("/login", userHandler.Login)
	}

	// Servir archivos estáticos (imágenes E-14 subidas por testigos)
	router.Static("/uploads", "./uploads")

	// Rutas protegidas (requieren token JWT válido)
	protected := router.Group("/api/v1")
	protected.Use(middleware.AuthMiddleware(jwtSecret))
	{
		protected.GET("/test-auth", func(c *gin.Context) {
			campaignID := c.GetString("campaign_id")
			userRole := c.GetString("user_role")
			c.JSON(http.StatusOK, gin.H{
				"campaign_id": campaignID,
				"user_role":   userRole,
			})
		})

		protected.POST("/voters", voterHandler.CreateVoter)
		protected.GET("/voters", voterHandler.GetVoters)

		protected.POST("/scrutiny", scrutinyHandler.SubmitReport)
		protected.GET("/scrutiny", scrutinyHandler.GetReports)

		protected.POST("/logistics/vehicles", logisticsHandler.CreateVehicle)
		protected.GET("/logistics/vehicles", logisticsHandler.GetVehicles)
		protected.POST("/logistics/inventory", logisticsHandler.CreateInventory)
		protected.POST("/logistics/dispatch", logisticsHandler.SubmitDispatch)

		protected.GET("/geo/sectors", geoHandler.GetSectorsReport)
	}

	// 5. Encender el Servidor HTTP
	log.Printf("Iniciando servidor en el puerto %s...\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Error al levantar el servidor de Gin: %v\n", err)
	}
}