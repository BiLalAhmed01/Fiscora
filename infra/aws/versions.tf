terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Remote state -- created by infra/aws-bootstrap (run that first). Fill in
  # the actual bucket/table names from its output before running `terraform
  # init` here for the first time; `-backend-config` values can't be
  # variables, so they're hardcoded once you know them.
  backend "s3" {
    bucket         = "REPLACE-ME-fiscora-terraform-state-<your-account-id>"
    key            = "fiscora/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "REPLACE-ME-fiscora-terraform-state-<your-account-id>-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
