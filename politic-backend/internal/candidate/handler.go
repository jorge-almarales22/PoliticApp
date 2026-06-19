package candidate

import (
	"log"
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

func saveUploadedPhoto(c *gin.Context, formKey string, dir string, existingURL string) (string, error) {
	file, err := c.FormFile(formKey)
	if err != nil {
		return existingURL, nil
	}

	if err := os.MkdirAll(dir, os.ModePerm); err != nil {
		return "", err
	}

	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	filePath := filepath.Join(dir, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		return "", err
	}

	return "/uploads/candidates/" + filename, nil
}

func (h *Handler) CreateCandidate(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	var input CreateCandidateInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	photoURL, err := saveUploadedPhoto(c, "photo", "./uploads/candidates", "")
	if err != nil {
		log.Printf("ERROR al guardar foto de candidato: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar la foto del candidato"})
		return
	}

	candidate, err := h.service.CreateCandidate(c.Request.Context(), input, campaignID, photoURL)
	if err != nil {
		log.Printf("ERROR al crear candidato: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al crear candidato"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"candidate": candidate})
}

func (h *Handler) GetCandidates(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	candidates, err := h.service.GetCandidates(c.Request.Context(), campaignID)
	if err != nil {
		log.Printf("ERROR GetCandidates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al consultar candidatos"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"candidates": candidates})
}

func (h *Handler) UpdateCandidate(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de candidato requerido"})
		return
	}

	existing, err := h.service.GetCandidate(c.Request.Context(), id, campaignID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Candidato no encontrado"})
		return
	}

	var input CreateCandidateInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	photoURL, err := saveUploadedPhoto(c, "photo", "./uploads/candidates", existing.PhotoURL)
	if err != nil {
		log.Printf("ERROR al guardar foto de candidato (update): %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar la foto del candidato"})
		return
	}

	candidate, err := h.service.UpdateCandidate(c.Request.Context(), id, campaignID, input, photoURL)
	if err != nil {
		log.Printf("ERROR al actualizar candidato: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al actualizar candidato"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"candidate": candidate})
}

func (h *Handler) DeleteCandidate(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de candidato requerido"})
		return
	}

	if err := h.service.DeleteCandidate(c.Request.Context(), id, campaignID); err != nil {
		log.Printf("ERROR DeleteCandidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al eliminar candidato"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Candidato eliminado exitosamente"})
}
