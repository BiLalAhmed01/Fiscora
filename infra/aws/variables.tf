variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Short name used to prefix/tag all resources"
  type        = string
  default     = "fiscora"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "prod"
}

# --- Networking ---

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to spread subnets across"
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = "true = one shared NAT gateway for all private subnets (cheaper, single point of failure for outbound traffic). false = one NAT gateway per AZ (current default, full AZ isolation)."
  type        = bool
  default     = false
}

# --- Backend (ECS Fargate) ---

variable "backend_container_port" {
  description = "Port the backend container listens on"
  type        = number
  default     = 8000
}

variable "backend_cpu" {
  description = "Fargate task CPU units for the backend"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Fargate task memory (MiB) for the backend"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Number of backend tasks to run"
  type        = number
  default     = 1
}

variable "backend_image_tag" {
  description = "Docker image tag to deploy (set by CI on each push, e.g. the git SHA)"
  type        = string
  default     = "latest"
}

# --- RDS Postgres ---

variable "db_name" {
  type    = string
  default = "fiscora"
}

variable "db_username" {
  type    = string
  default = "fiscora"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Storage in GB"
  type        = number
  default     = 20
}

# --- Secrets (values pulled from CI secrets / a tfvars file that is gitignored) ---

variable "jwt_secret" {
  description = "JWT signing secret for the backend"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "xai_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "google_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "default_provider" {
  type    = string
  default = "openai"
}

variable "default_model_id" {
  type    = string
  default = "gpt-5.2-2025-12-11"
}

# --- Amplify (frontend) ---

variable "amplify_repo_url" {
  description = "HTTPS URL of the GitHub repo Amplify will build from, e.g. https://github.com/org/fiscora"
  type        = string
}

variable "amplify_github_access_token" {
  description = "GitHub personal access token with repo scope, used by Amplify to connect to the repo (only needed on first apply/whenever it needs to reconnect)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "amplify_branch" {
  description = "Git branch Amplify deploys from"
  type        = string
  default     = "main"
}
