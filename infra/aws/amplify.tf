resource "aws_amplify_app" "frontend" {
  name       = "${local.name}-frontend"
  repository = var.amplify_repo_url

  # Only required the first time Amplify connects to a private repo, or when
  # the connection needs to be re-authorized. Once connected in the console
  # this can be omitted from future applies.
  access_token = var.amplify_github_access_token != "" ? var.amplify_github_access_token : null

  platform = "WEB_COMPUTE" # supports Next.js SSR/API routes; use "WEB" for a pure static export

  build_spec = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - cd frontend && npm ci
        build:
          commands:
            - cd frontend && npm run build
      artifacts:
        baseDirectory: frontend/.next
        files:
          - '**/*'
      cache:
        paths:
          - frontend/node_modules/**/*
  YAML

  environment_variables = {
    NEXT_PUBLIC_API_URL       = "https://${local.api_fqdn}"
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
  }

  auto_branch_creation_config {
    enable_auto_build = true
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = var.amplify_branch

  framework   = "Next.js - SSR"
  stage       = "PRODUCTION"
  enable_auto_build = true
}

resource "aws_amplify_domain_association" "frontend" {
  app_id      = aws_amplify_app.frontend.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = var.app_subdomain
  }

  # Amplify manages its own ACM cert + Route 53 validation records for this
  # domain internally once the zone is delegated to it (it looks up the
  # hosted zone by domain_name in this account, same one acm.tf uses).
  wait_for_verification = true

  depends_on = [aws_route53_zone.main, data.aws_route53_zone.main]
}
