terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # S3 Files (aws_s3files_*) resources require provider >= 6.40.
      version = "~> 6.65"
    }
  }
}

variable "aws_profile" {
  description = "Local AWS profile used to authenticate against account 038462770458."
  type        = string
  default     = "Laravel-Cloud-Dev-US-Ohio-CCC-2/AdministratorAccess"
}

variable "aws_region" {
  description = "Region the bucket and file system are created in."
  type        = string
  default     = "us-east-2"
}

variable "bucket_prefix" {
  description = "Prefix for the generated S3 bucket name."
  type        = string
  default     = "cloud-s3-files-demo-"
}

variable "vpc_id" {
  description = "VPC the mount targets are created in."
  type        = string
  default     = "vpc-0ea4fcb15f2f9bbe9"
}

variable "mount_target_subnet_ids" {
  description = "Dual-stack subnets, one per Availability Zone, that get a mount target."
  type        = list(string)
  default = [
    "subnet-079faad1f34adc97e",
    "subnet-03e6130d46e06b3d4",
    "subnet-0949f486b1d9dba22",
  ]
}

provider "aws" {
  profile = var.aws_profile
  region  = var.aws_region

  # Fail fast if the profile ever resolves to a different account.
  allowed_account_ids = ["038462770458"]

  default_tags {
    tags = {
      Project   = "cloud-s3-files-demo"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

#
# Bucket backing the file system. S3 Files requires versioning to be enabled
# before the file system is created.
#
resource "aws_s3_bucket" "files" {
  bucket_prefix = var.bucket_prefix
  force_destroy = true

  # What the customer workload role's S3 ABAC policy matches on. Tags are set
  # here rather than in a later resource because enabling bucket ABAC blocks
  # PutBucketTagging, which is the API backing this field.
  tags = {
    (var.environment_uuid_tag_key) = var.environment_uuid
  }
}

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

#
# Role S3 Files assumes to read and write objects in the bucket, and to manage
# the EventBridge rules it uses to keep the file system in sync.
#
resource "aws_iam_role" "files" {
  name_prefix = "s3files-demo-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3FilesAssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "elasticfilesystem.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:${data.aws_partition.current.partition}:s3files:${var.aws_region}:${data.aws_caller_identity.current.account_id}:file-system/*"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "files" {
  name_prefix = "s3files-demo-"
  role        = aws_iam_role.files.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BucketPermissions"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:ListBucketVersions",
        ]
        Resource = aws_s3_bucket.files.arn
        Condition = {
          StringEquals = {
            "aws:ResourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "S3ObjectPermissions"
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:DeleteObject*",
          "s3:GetObject*",
          "s3:List*",
          "s3:PutObject*",
        ]
        Resource = "${aws_s3_bucket.files.arn}/*"
        Condition = {
          StringEquals = {
            "aws:ResourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "EventBridgeManage"
        Effect = "Allow"
        Action = [
          "events:DeleteRule",
          "events:DisableRule",
          "events:EnableRule",
          "events:PutRule",
          "events:PutTargets",
          "events:RemoveTargets",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:events:*:*:rule/DO-NOT-DELETE-S3-Files*"
        Condition = {
          StringEquals = {
            "events:ManagedBy" = "elasticfilesystem.amazonaws.com"
          }
        }
      },
      {
        Sid    = "EventBridgeRead"
        Effect = "Allow"
        Action = [
          "events:DescribeRule",
          "events:ListRuleNamesByTarget",
          "events:ListRules",
          "events:ListTargetsByRule",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:events:*:*:rule/*"
      }
    ]
  })
}

resource "aws_s3files_file_system" "files" {
  bucket   = aws_s3_bucket.files.arn
  role_arn = aws_iam_role.files.arn

  # Versioning must exist before the file system is created, and the file
  # system must be gone before versioning can be changed back on destroy.
  depends_on = [
    aws_s3_bucket_versioning.files,
    aws_iam_role_policy.files,
  ]
}

#
# What gets pulled into the file system from the bucket, and when it is evicted
# again after sitting unread.
#
resource "aws_s3files_synchronization_configuration" "files" {
  file_system_id = aws_s3files_file_system.files.id

  import_data_rule {
    prefix         = ""
    size_less_than = 52673613135872
    trigger        = "ON_FILE_ACCESS"
  }

  expiration_data_rule {
    days_after_last_access = 30
  }
}

resource "aws_s3files_access_point" "files" {
  file_system_id = aws_s3files_file_system.files.id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/"
  }
}

#
# Network access to the file system. The subnets are dual-stack, so the mount
# targets are too, and the security group allows NFS over both families.
#
data "aws_vpc" "mount_targets" {
  id = var.vpc_id
}

resource "aws_security_group" "mount_targets" {
  name_prefix = "s3files-demo-"
  description = "NFS access to the S3 Files mount targets."
  vpc_id      = data.aws_vpc.mount_targets.id
}

resource "aws_vpc_security_group_ingress_rule" "mount_targets_nfs" {
  for_each = {
    for association in data.aws_vpc.mount_targets.ipv6_cidr_block_associations :
    association.ipv6_cidr_block => association
  }

  security_group_id = aws_security_group.mount_targets.id
  description       = "NFS from within the VPC."

  cidr_ipv6   = each.key
  from_port   = 2049
  to_port     = 2049
  ip_protocol = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "mount_targets_nfs_ipv4" {
  for_each = toset(data.aws_vpc.mount_targets.cidr_block_associations[*].cidr_block)

  security_group_id = aws_security_group.mount_targets.id
  description       = "NFS from within the VPC."

  cidr_ipv4   = each.key
  from_port   = 2049
  to_port     = 2049
  ip_protocol = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "mount_targets_all_ipv4" {
  security_group_id = aws_security_group.mount_targets.id
  description       = "Allow all outbound."

  cidr_ipv4   = "0.0.0.0/0"
  ip_protocol = "-1"
}

resource "aws_vpc_security_group_egress_rule" "mount_targets_all_ipv6" {
  security_group_id = aws_security_group.mount_targets.id
  description       = "Allow all outbound."

  cidr_ipv6   = "::/0"
  ip_protocol = "-1"
}

resource "aws_s3files_mount_target" "files" {
  for_each = toset(var.mount_target_subnet_ids)

  file_system_id  = aws_s3files_file_system.files.id
  subnet_id       = each.value
  ip_address_type = "DUAL_STACK"
  security_groups = [aws_security_group.mount_targets.id]
}

output "bucket_name" {
  description = "Name of the bucket backing the file system."
  value       = aws_s3_bucket.files.id
}

output "file_system_id" {
  description = "S3 Files file system ID."
  value       = aws_s3files_file_system.files.id
}

output "access_point_id" {
  description = "S3 Files access point ID."
  value       = aws_s3files_access_point.files.id
}

output "mount_target_addresses" {
  description = "IPv4 and IPv6 address of each mount target, keyed by subnet ID."
  value = {
    for subnet_id, mount_target in aws_s3files_mount_target.files : subnet_id => {
      ipv4 = mount_target.ipv4_address
      ipv6 = mount_target.ipv6_address
    }
  }
}

output "mount_target_security_group_id" {
  description = "Security group attached to the mount targets."
  value       = aws_security_group.mount_targets.id
}
