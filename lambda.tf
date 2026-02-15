

resource "aws_s3_bucket" "lambda_artifacts" {
  bucket = "${var.project_name}-lambda-artifacts-${var.environment}"

  force_destroy = true
}

resource "aws_iam_role_policy" "lambda_basic_logs" {
  name = "lambda-basic-logs"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_s3_access" {
  name = "lambda-s3-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::tejas-images" 
      },
      {
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = "arn:aws:s3:::tejas-images/*"
      }
    ]
  })
}

resource "aws_lambda_function" "express" {
  function_name = "express-api"
  runtime       = "nodejs18.x"
  handler       = "lambda.handler"
  role          = aws_iam_role.lambda_role.arn

#   filename         = "express-lambda.zip"
#   source_code_hash = filebase64sha256("express-lambda.zip")
  s3_bucket = aws_s3_bucket.lambda_artifacts.bucket
  s3_key    = aws_s3_bucket_object.lambda_zip.key

  memory_size = 512
  timeout     = 10
}

resource "aws_s3_bucket_object" "lambda_zip" {
  bucket = aws_s3_bucket.lambda_artifacts.bucket
  key    = "express/express-lambda.zip"
  source = "express-lambda.zip"
  etag   = filemd5("express-lambda.zip")
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.express.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_iam_role_policy" "lambda_rekognition_access" {
  name = "lambda-rekognition-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rekognition:CompareFaces",
          "rekognition:DetectFaces",
          "rekognition:SearchFacesByImage",
          "rekognition:IndexFaces"
        ]
        Resource = "*"
      }
    ]
  })
}