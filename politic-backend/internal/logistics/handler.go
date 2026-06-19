package logistics

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func saveUploaded(c *gin.Context, formKey string, dir string) string {
	file, err := c.FormFile(formKey)
	if err != nil {
		return ""
	}
	fullDir := filepath.Join(".", "uploads", dir)
	if err := os.MkdirAll(fullDir, os.ModePerm); err != nil {
		return ""
	}
	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	filePath := filepath.Join(fullDir, filename)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		return ""
	}
	return "/uploads/" + dir + "/" + filename
}

func (h *Handler) CreateDriver(c *gin.Context) {
	var input CreateDriverInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	licenseURL := saveUploaded(c, "license_pdf", "licencias")
	driver, err := h.service.CreateDriver(c.Request.Context(), input, licenseURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear conductor"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"driver": driver})
}

func (h *Handler) GetDrivers(c *gin.Context) {
	drivers, err := h.service.GetDrivers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar conductores"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"drivers": drivers})
}

func (h *Handler) CreateVehicle(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}
	var input CreateVehicleInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	imageURL := saveUploaded(c, "image", "vehiculos")
	soatURL := saveUploaded(c, "soat_pdf", "vehiculos")
	tecnoURL := saveUploaded(c, "tecnomecanica_pdf", "vehiculos")
	vehicle, err := h.service.CreateVehicle(c.Request.Context(), input, campaignID, imageURL, soatURL, tecnoURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear vehiculo"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"vehicle": vehicle})
}

func (h *Handler) GetVehicles(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}
	vehicles, err := h.service.GetVehicles(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar vehiculos"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"vehicles": vehicles})
}

func (h *Handler) UpdateVehicleStatus(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}
	id := c.Param("id")
	var body struct{ Status string `json:"status" binding:"required"` }
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.UpdateVehicleStatus(c.Request.Context(), id, campaignID, body.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar estado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Estado actualizado"})
}

func (h *Handler) CreateInventory(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}
	var input CreateInventoryInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	imageURL := saveUploaded(c, "image", "inventario")
	item, err := h.service.CreateInventory(c.Request.Context(), input, campaignID, imageURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear item"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"inventory_item": item})
}

func (h *Handler) GetInventory(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}
	items, err := h.service.GetInventory(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar inventario"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"inventory_items": items})
}

func (h *Handler) SubmitDispatch(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear despacho"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"dispatch": dispatch})
}

func (h *Handler) GetDispatches(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}
	list, err := h.service.GetDispatches(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar despachos"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"dispatches": list})
}

func (h *Handler) ReceiveDispatch(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.ReceiveDispatch(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al confirmar recepcion"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Recepcion confirmada"})
}
