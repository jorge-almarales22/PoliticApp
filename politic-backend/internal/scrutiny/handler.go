package scrutiny

import (
	"encoding/json"
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

func (h *Handler) SubmitReport(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	witnessID := c.GetString("user_id")
	if witnessID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: user_id no encontrado en el token"})
		return
	}

	var input CreateScrutinyInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	candidateVotes := input.CandidateVotes
	if candidateVotes == "" {
		candidateVotes = "[]"
	}

	cv, err := ParseCandidateVotes(candidateVotes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato invalido en candidate_votes: debe ser un arreglo JSON"})
		return
	}

	cvJSON, err := json.Marshal(cv)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al serializar candidate_votes"})
		return
	}

	var e14ImageURL string
	file, err := c.FormFile("e14_image")
	if err == nil {
		uploadDir := "./uploads/e14"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear directorio de uploads"})
			return
		}

		ext := filepath.Ext(file.Filename)
		filename := uuid.New().String() + ext
		filePath := filepath.Join(uploadDir, filename)

		if err := c.SaveUploadedFile(file, filePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar la imagen E-14"})
			return
		}

		e14ImageURL = "/uploads/e14/" + filename
	}

	report := &ScrutinyReport{
		CampaignID:     campaignID,
		WitnessID:      witnessID,
		VotingPlace:    input.VotingPlace,
		TableNumber:    input.TableNumber,
		Zone:           input.Zone,
		VotosBlanco:    input.VotosBlanco,
		VotosNulos:     input.VotosNulos,
		CandidateVotes: string(cvJSON),
		E14ImageURL:    e14ImageURL,
	}

	if err := h.service.ProcessReport(c.Request.Context(), report); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al procesar el reporte de escrutinio"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"report": report})
}

func (h *Handler) GetReports(c *gin.Context) {
	campaignID := c.GetString("campaign_id")
	if campaignID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado: campaign_id no encontrado en el token"})
		return
	}

	reports, err := h.service.GetReports(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al consultar reportes de escrutinio"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reports": reports})
}
