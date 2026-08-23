# HTTPS is not optional: Amplify serves the frontend over https:// and
# browsers block a page served over https from calling a plain http:// API
# (mixed content). `domain_name` has no default on purpose -- this stack
# refuses to plan/apply until you own a domain and set it, rather than
# silently standing up a broken (http-only) deployment.

variable "domain_name" {
  description = "Root domain you own, e.g. fiscora.app (no default -- required)"
  type        = string
}

variable "api_subdomain" {
  description = "Subdomain the backend API is served on"
  type        = string
  default     = "api"
}

variable "app_subdomain" {
  description = "Subdomain the frontend is served on"
  type        = string
  default     = "app"
}

variable "create_route53_zone" {
  description = "true if this domain's DNS is not already hosted in Route 53 in this account (Terraform creates the zone; you then update nameservers at your registrar). false to use an existing hosted zone."
  type        = bool
  default     = true
}

locals {
  api_fqdn = "${var.api_subdomain}.${var.domain_name}"
  app_fqdn = "${var.app_subdomain}.${var.domain_name}"
}

resource "aws_route53_zone" "main" {
  count = var.create_route53_zone ? 1 : 0
  name  = var.domain_name
}

data "aws_route53_zone" "main" {
  count        = var.create_route53_zone ? 0 : 1
  name         = var.domain_name
  private_zone = false
}

locals {
  zone_id = var.create_route53_zone ? aws_route53_zone.main[0].zone_id : data.aws_route53_zone.main[0].zone_id
}

# --- Certificate for the API (used by the ALB listener) ---

resource "aws_acm_certificate" "api" {
  domain_name       = local.api_fqdn
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for r in aws_route53_record.api_cert_validation : r.fqdn]
}

resource "aws_route53_record" "api" {
  zone_id = local.zone_id
  name    = local.api_fqdn
  type    = "A"

  alias {
    name                   = aws_lb.backend.dns_name
    zone_id                = aws_lb.backend.zone_id
    evaluate_target_health = true
  }
}

output "nameservers_to_set_at_your_registrar" {
  description = "Only relevant if create_route53_zone = true: point your registrar's nameservers at these"
  value       = var.create_route53_zone ? aws_route53_zone.main[0].name_servers : []
}

output "api_url" {
  value = "https://${local.api_fqdn}"
}

output "app_url" {
  value = "https://${local.app_fqdn}"
}
