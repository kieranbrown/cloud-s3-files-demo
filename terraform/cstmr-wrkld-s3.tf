#
# S3 ABAC policy for the customer workload role.
#
# Mirrors the `sqs-abac` policy that cloud-terraform-aws-region attaches to the
# same role (modules/customer-eks/managed-queue.tf): a pod may touch a resource
# only when that resource carries an `environment-uuid` tag equal to the pod's
# own `kubernetes-namespace` session tag, which EKS Pod Identity sets and the
# pod cannot influence.
#
# This is attached as a separate inline policy on the EXISTING role, which is
# managed by the region module. Nothing here creates or modifies the role
# itself, so `terraform destroy` removes only this policy and leaves the role
# and its `sqs-abac` / `external-assume-role` policies untouched.
#
# Two statements because bucket-level and object-level actions take different
# resource ARNs. `aws:ResourceTag` for object actions resolves against the
# owning bucket's tags, which only happens once ABAC is enabled on the bucket
# (see `terraform_data.bucket_abac` below) — without that, S3 never evaluates
# the condition and every request is denied.
#

variable "customer_workload_role_name" {
  description = "Existing customer workload role the S3 ABAC policy is attached to."
  type        = string
  default     = "dev-cstmr-wrkld"
}

variable "environment_uuid" {
  description = "Environment namespace whose pods should reach the demo bucket. Must match the namespace's `kubernetes-namespace` Pod Identity session tag."
  type        = string
  default     = "env-a2c6b234-995c-4691-bb85-9af81f612aac"
}

variable "environment_uuid_tag_key" {
  description = "Resource tag the ABAC condition matches on."
  type        = string
  default     = "cloud.laravel.net/environment-uuid"
}

data "aws_organizations_organization" "current" {}

resource "aws_iam_role_policy" "customer_workload_s3" {
  name = "s3-abac"
  role = var.customer_workload_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BucketOperations"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:ListBucketVersions",
          "s3:ListBucketMultipartUploads",
          "s3:GetBucketLocation",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:s3:::*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/${var.environment_uuid_tag_key}" = "$${aws:PrincipalTag/kubernetes-namespace}"
            # Keeps the grant inside the Laravel org. Without it, anyone with
            # an AWS account could tag a bucket with a known environment UUID
            # and become a write target for that environment's pods.
            # Production should narrow this to the OU path, the way the SQS
            # policy does.
            "aws:ResourceOrgID" = data.aws_organizations_organization.current.id
          }
        }
      },
      {
        Sid    = "ObjectOperations"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload",
          "s3:ListMultipartUploadParts",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:s3:::*/*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/${var.environment_uuid_tag_key}" = "$${aws:PrincipalTag/kubernetes-namespace}"
            "aws:ResourceOrgID"                               = data.aws_organizations_organization.current.id
          }
        }
      },
    ]
  })
}

#
# ABAC is off by default on general purpose buckets, and while it is off S3
# does not evaluate `aws:ResourceTag` at all — the policy above would deny
# everything. There is no provider resource for this yet, so it is a CLI call
# with a matching disable on destroy.
#
# Enabling ABAC also disables PutBucketTagging on this bucket, which is the API
# the provider uses to write `aws_s3_bucket.tags`. The bucket's tags are
# therefore applied before this runs, and must not change while it is enabled.
#
resource "terraform_data" "bucket_abac" {
  input = {
    bucket  = aws_s3_bucket.files.id
    region  = var.aws_region
    profile = var.aws_profile
  }

  provisioner "local-exec" {
    command = "aws s3api put-bucket-abac --bucket ${self.input.bucket} --abac-status Status=Enabled --region ${self.input.region} --profile '${self.input.profile}'"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "aws s3api put-bucket-abac --bucket ${self.input.bucket} --abac-status Status=Disabled --region ${self.input.region} --profile '${self.input.profile}'"
  }
}

output "customer_workload_policy" {
  description = "Role and inline policy granting the environment's pods access to tagged buckets."
  value       = "${var.customer_workload_role_name}/${aws_iam_role_policy.customer_workload_s3.name}"
}

output "environment_uuid" {
  description = "Environment namespace the demo bucket is tagged for."
  value       = var.environment_uuid
}
