package user

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service   Service
	jwtSecret string
}

func NewHandler(service Service, jwtSecret string) *Handler {
	return &Handler{service: service, jwtSecret: jwtSecret}
}

func (h *Handler) Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	output, err := h.service.Register(c.Request.Context(), input)
	if err != nil {
		if errors.Is(err, ErrUserAlreadyExists) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		log.Printf("ERROR Register: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al registrar usuario"})
		return
	}

	c.JSON(http.StatusCreated, output)
}

func (h *Handler) Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	output, err := h.service.Login(c.Request.Context(), input, h.jwtSecret)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		log.Printf("ERROR Login: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al iniciar sesion"})
		return
	}

	c.JSON(http.StatusOK, output)
}

func (h *Handler) GetUsers(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}

	users, err := h.service.GetUsersByCampaign(c.Request.Context(), campaignID)
	if err != nil {
		log.Printf("ERROR GetUsers: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar usuarios"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}
