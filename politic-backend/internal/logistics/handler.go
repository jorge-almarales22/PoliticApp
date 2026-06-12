package logistics

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) CreateVehicle(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	var input CreateVehicleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vehicle, err := h.service.CreateVehicle(c.Request.Context(), input, campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al crear vehículo"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"vehicle": vehicle})
}

func (h *Handler) GetVehicles(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	vehicles, err := h.service.GetVehicles(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al consultar vehículos"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"vehicles": vehicles})
}

func (h *Handler) CreateInventory(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	var input CreateInventoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.service.CreateInventory(c.Request.Context(), input, campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al crear ítem de inventario"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"inventory_item": item})
}

func (h *Handler) SubmitDispatch(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	var input CreateDispatchInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dispatch, err := h.service.SubmitDispatch(c.Request.Context(), input, campaignID)
	if err != nil {
		if errors.Is(err, ErrInsufficientStock) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, ErrInventoryNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al crear despacho"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"dispatch": dispatch})
}
