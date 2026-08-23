locals {
  database_url = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.address}:5432/${var.db_name}"
}

resource "aws_secretsmanager_secret" "backend" {
  name = "${local.name}-backend-env"
}

resource "aws_secretsmanager_secret_version" "backend" {
  secret_id = aws_secretsmanager_secret.backend.id
  secret_string = jsonencode({
    DATABASE_URL   = local.database_url
    JWT_SECRET     = var.jwt_secret
    OPENAI_API_KEY = var.openai_api_key
    XAI_API_KEY    = var.xai_api_key
    GOOGLE_API_KEY = var.google_api_key
  })
}
