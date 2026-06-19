package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func ValidateCampaign(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		campaignID := c.GetString("campaign_id")
		if campaignID == "" {
			c.Next()
			return
		}

		var exists bool
		err := pool.QueryRow(c.Request.Context(),
			`SELECT EXISTS(SELECT 1 FROM campaigns WHERE id = $1)`, campaignID,
		).Scan(&exists)

		if err != nil || !exists {
			c.AbortWithStatusJSON(http.StatusPreconditionFailed, gin.H{
				"error":   "Campana no encontrada",
				"message": "Debes crear una campana antes de usar la aplicacion. Ejecuta: INSERT INTO campaigns (id, name) VALUES ('" + campaignID + "', 'Mi Campana');",
				"code":    "CAMPAIGN_NOT_FOUND",
			})
			return
		}

		c.Next()
	}
}
