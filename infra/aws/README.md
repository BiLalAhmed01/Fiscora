# Fiscora on AWS

Terraform for a production deploy:

- **Backend** (FastAPI + Agno): Docker image on **ECR**, run on **ECS Fargate**
  behind an **ALB** (HTTPS only, HTTP redirects to HTTPS), in private subnets
  with NAT gateway(s) for outbound calls (LLM providers, yfinance, etc).
- **Database**: **RDS Postgres**, private subnets only, reachable from the
  backend security group only.
- **Schema migrations**: **Alembic** (`backend/alembic/`). CI runs
  `alembic upgrade head` as a one-off ECS task, using the new image, *before*
  rolling the service — if the migration fails, the deploy stops and the old
  service keeps running.
- **Frontend** (Next.js): **AWS Amplify Hosting**, connected directly to the
  GitHub repo — Amplify builds and deploys on every push to `main` on its own,
  no GitHub Actions step needed. Custom domain via `aws_amplify_domain_association`.
- **TLS**: **ACM** certificate for the API domain, DNS-validated via
  **Route 53**; HTTPS-only ALB listener. Amplify manages its own cert for the
  frontend domain automatically.
- **Secrets** (JWT secret, LLM API keys, DB URL): **Secrets Manager**, injected
  into the ECS task at runtime — never baked into the image or committed.
- **CI/CD for the backend**: `.github/workflows/deploy-backend.yml` builds the
  image, runs the migration task, then updates the ECS service, on push to
  `main`. Authenticates to AWS via GitHub OIDC (no long-lived AWS keys in
  GitHub).
- **State**: remote, in S3 with DynamoDB locking (see step 1 below) — **not**
  a local `.tfstate` file. Required before you apply this stack for real.

## One-time setup

### 0. Prerequisites

- Terraform >= 1.7, AWS CLI, AWS credentials with permission to create
  VPC/ECS/RDS/IAM/ACM/Route53/Amplify/S3/DynamoDB resources.
- **A domain you own.** HTTPS is not optional here — Amplify serves the
  frontend over `https://`, and browsers block that page from calling a plain
  `http://` API (mixed content). `domain_name` has no default and Terraform
  will refuse to plan without it. If you don't have one yet, buying one
  through Route 53 Domains keeps everything in one console and skips the
  nameserver-update step below (~$12-40/yr depending on the TLD).

### 1. Bootstrap remote state (do this before anything else)

State must not live only on your laptop. `infra/aws-bootstrap/` creates the
S3 bucket + DynamoDB lock table `infra/aws`'s own state will live in:

```bash
cd infra/aws-bootstrap
terraform init
terraform apply -var="bucket_name=fiscora-terraform-state-<your-aws-account-id>"
```

Then edit `infra/aws/versions.tf`'s `backend "s3"` block, replacing the two
`REPLACE-ME-...` placeholders with the bucket name you just created (and
`<bucket_name>-lock` for the DynamoDB table). This can't be a variable —
Terraform backend config must be literal.

### 2. Configure the main stack

```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars
terraform init
```

Fill in `terraform.tfvars`:

- `jwt_secret` — generate one: `openssl rand -hex 32`
- At least one of `openai_api_key` / `xai_api_key` / `google_api_key`
- `amplify_repo_url`, `github_repo`
- `domain_name` — the domain you own. Leave `create_route53_zone = true`
  unless that domain's DNS is already hosted in Route 53 in this AWS account.

**If `create_route53_zone = true`** (the default): after the first `apply`,
run `terraform output nameservers_to_set_at_your_registrar` and set those as
the domain's nameservers at whatever registrar you bought it from. DNS
validation (for the API's ACM cert and Amplify's own cert) won't complete
until that propagates — can take a few minutes to a few hours.

**If `create_route53_zone = false`**: nothing extra needed, Terraform finds
your existing hosted zone by `domain_name` and validates directly.

### 3. First Amplify connection

Amplify needs a GitHub token the first time it links the repo. Create a
GitHub PAT (classic, `repo` scope) and set it as `amplify_github_access_token`
in `terraform.tfvars` for the first `apply` only — afterwards you can blank it
out, Amplify keeps the connection.

### 4. Apply

```bash
terraform apply
```

Provisions everything above. The ECS service will fail to start tasks until
an image exists in ECR — that happens in step 6. ACM/Amplify domain
validation may take a while to go green; `apply` waits for it.

### 5. Wire up GitHub Actions

Add these repo secrets (values from `terraform output`):

| Secret | From |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `terraform output github_deploy_role_arn` |
| `ECS_PRIVATE_SUBNET_IDS` | `terraform output private_subnet_ids` (join with commas, no spaces, no quotes — e.g. `subnet-abc,subnet-def`) |
| `ECS_BACKEND_SECURITY_GROUP_ID` | `terraform output backend_security_group_id` |

### 6. First real deploy

Push to `main` (touching `backend/**` or `requirements.txt`). The workflow
builds the image, pushes to ECR, runs `alembic upgrade head` against RDS as a
one-off task, and only then updates the ECS service. Check the Actions log if
the migration step fails — the service is left untouched in that case.

## Day to day

- **Backend changes**: push to `main` — build, migrate, deploy, in that order.
- **Frontend changes**: push to `main` — Amplify handles the rest.
- **Infra changes**: edit the `.tf` files, `terraform plan`, `terraform apply`.
- **New model/schema change**: `alembic revision --autogenerate -m "..."`
  locally against a real DB, review the generated migration, commit it — CI
  applies it automatically on the next deploy.
- **Rollback backend**: re-run the `deploy-backend` workflow against an older
  commit (it will also re-run whatever migration state that commit expects —
  Alembic migrations should be written to be safe to re-run/no-op if already
  applied, and schema rollbacks are a separate manual `alembic downgrade` if
  you ever actually need one, not automated here on purpose).

## Costs (rough, us-east-1)

Smallest viable setup (`db.t4g.micro`, 1 Fargate task at 0.5 vCPU/1GB):
roughly **$90-120/mo**, dominated by NAT gateways and RDS.

**NAT gateways — the biggest line item:**

| | 1 per AZ (default, `single_nat_gateway = false`) | Shared (`single_nat_gateway = true`) |
|---|---|---|
| Cost | ~$65-70/mo (2 × ~$32/mo + data processing) | ~$32-35/mo (1 × that) |
| What you get | Each AZ's outbound traffic (LLM calls, yfinance, etc) survives if the *other* AZ's NAT/AZ has an outage | All outbound traffic funnels through one NAT in one AZ — if that AZ has an outage, tasks in the *other* AZ lose outbound internet access too (they can still reach the ALB/each other, just not the internet) |
| When it matters | You're running >1 backend task across AZs and want real AZ-fault-tolerance for outbound calls | You're running a single task (or don't care about that specific failure mode) — the ECS *service* itself, RDS, and the ALB are still fine, this only affects outbound internet reachability during an AZ outage |

At `backend_desired_count = 1` (the current default), you already have no
task-level redundancy, so the second NAT gateway is buying AZ-outage
resilience for a service that isn't itself redundant yet — a fair argument
for `single_nat_gateway = true` until you actually run ≥2 tasks. Flip it in
`terraform.tfvars` and re-apply whenever you decide; no other changes needed.
