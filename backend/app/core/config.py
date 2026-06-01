from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "NiveshIQ AI Portfolio Intelligence Engine"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str
    
    # Vertex AI Settings (Phase 6+)
    VERTEX_PROJECT_ID: str
    VERTEX_LOCATION: str = "global"
    GOOGLE_CLIENT_ID: str
    RESEND_API_KEY: str
    EMAIL_FROM: str = "onboarding@resend.dev"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
