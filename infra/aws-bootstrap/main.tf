# One-time bootstrap: creates the S3 bucket + DynamoDB lock table that
# infra/aws's own Terraform state will live in. This config's own state stays
# local (chicken-and-egg -- there's nowhere else for it to live yet), and is
# not meant to change often after the first apply.
#
# Usage:
#   cd infra/aws-bootstrap
#   terraform init
#   terraform apply -var="bucket_name=fiscora-terraform-state-<something-unique>"
#
# Then wire infra/aws/versions.tf's backend "s3" block to the resulting
# bucket/table (see that file) and run `terraform init -migrate-state` in
# infra/aws to move state off disk and into S3.

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "bucket_name" {
  description = "Globally-unique S3 bucket name for Terraform state (e.g. fiscora-terraform-state-<your-aws-account-id>)"
  type        = string
}

resource "aws_s3_bucket" "state" {
  bucket = var.bucket_name

  # Guard against `terraform destroy` (run from the wrong directory, e.g.)
  # ever taking out the bucket holding every other stack's state.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "lock" {
  name         = "${var.bucket_name}-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

output "bucket_name" {
  value = aws_s3_bucket.state.bucket
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.lock.name
}
