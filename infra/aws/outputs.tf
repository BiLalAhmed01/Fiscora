output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "backend_alb_dns_name" {
  value = aws_lb.backend.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}

output "amplify_app_id" {
  value = aws_amplify_app.frontend.id
}

output "amplify_default_domain" {
  value = aws_amplify_app.frontend.default_domain
}

output "rds_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "private_subnet_ids" {
  description = "Used by CI to run the one-off Alembic migration task in the same network as the service"
  value       = aws_subnet.private[*].id
}

output "backend_security_group_id" {
  value = aws_security_group.backend.id
}

output "backend_task_execution_role_arn" {
  value = aws_iam_role.execution.arn
}

output "backend_task_role_arn" {
  value = aws_iam_role.task.arn
}
