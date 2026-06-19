package voter

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) CreateVoter(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	var input CreateVoterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	voter, err := h.service.CreateVoter(c.Request.Context(), input, campaignID)
	if err != nil {
		log.Printf("ERROR CreateVoter: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al registrar votante"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"voter": voter})
}

func (h *Handler) GetVoters(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	voters, err := h.service.GetVoters(c.Request.Context(), campaignID)
	if err != nil {
		log.Printf("ERROR GetVoters: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al consultar votantes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"voters": voters})
}

func (h *Handler) UpdateVoter(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de votante requerido en la ruta"})
		return
	}

	var input CreateVoterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	voter, err := h.service.UpdateVoter(c.Request.Context(), id, campaignID, input)
	if err != nil {
		log.Printf("ERROR UpdateVoter: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al actualizar votante"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"voter": voter})
}

func (h *Handler) DeleteVoter(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de votante requerido en la ruta"})
		return
	}

	if err := h.service.DeleteVoter(c.Request.Context(), id, campaignID); err != nil {
		log.Printf("ERROR DeleteVoter: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al eliminar votante"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Votante eliminado exitosamente"})
}
