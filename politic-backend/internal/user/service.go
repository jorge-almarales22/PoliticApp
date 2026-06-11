package user

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("credenciales inválidas")
	ErrUserAlreadyExists  = errors.New("el usuario ya existe")
)

type Service interface {
	Register(ctx context.Context, input RegisterInput) (*RegisterOutput, error)
	Login(ctx context.Context, input LoginInput, secret string) (*LoginOutput, error)
}

type RegisterOutput struct {
	User User `json:"user"`
}

type LoginOutput struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type JWTClaims struct {
	UserID     string `json:"user_id"`
	CampaignID string `json:"campaign_id"`
	Role       string `json:"role"`
	jwt.RegisteredClaims
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Register(ctx context.Context, input RegisterInput) (*RegisterOutput, error) {
	existing, _ := s.repo.GetByEmail(ctx, input.Email)
	if existing != nil {
		return nil, ErrUserAlreadyExists
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &User{
		Email:        input.Email,
		PasswordHash: string(hashedBytes),
		FullName:     input.FullName,
		Role:         input.Role,
		CampaignID:   &input.CampaignID,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	return &RegisterOutput{User: *user}, nil
}

func (s *service) Login(ctx context.Context, input LoginInput, secret string) (*LoginOutput, error) {
	user, err := s.repo.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	campaignID := ""
	if user.CampaignID != nil {
		campaignID = *user.CampaignID
	}

	claims := &JWTClaims{
		UserID:     user.ID,
		CampaignID: campaignID,
		Role:       user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		return nil, err
	}

	return &LoginOutput{
		Token: signedToken,
		User:  *user,
	}, nil
}
