aws_region  = "us-east-1"        # Your preferred AWS region
environment = "prod"              # Environment name

project_name = "is-captured-image-tejas-backend"

# Optional: Specify custom bucket names
# If left empty, names will be auto-generated
# images_bucket_name   = "my-tejas-images-bucket"
# frontend_bucket_name = "my-tejas-frontend-bucket"

reference_images_prefix = "tejas/"
similarity_threshold    = 80

lambda_timeout     = 15
lambda_memory_size = 512

log_retention_days = 7
