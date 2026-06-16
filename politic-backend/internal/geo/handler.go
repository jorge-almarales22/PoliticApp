package geo

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetSectorsReport(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	reports, err := h.service.GetSectorsReport(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al consultar reporte de sectores"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sectors": reports})
}

func (h *Handler) GetDashboardMetrics(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	metrics, err := h.service.GetDashboardMetrics(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al consultar métricas del dashboard"})
		return
	}

	c.JSON(http.StatusOK, metrics)
}
