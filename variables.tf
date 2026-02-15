variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "lambda_timeout" {
  type        = number
}

variable "lambda_memory_size" {
  type        = number
}

variable "log_retention_days" {
  type        = number
}

variable "reference_images_prefix" {
  type        = string
}

variable "similarity_threshold" {
  type        = number
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}