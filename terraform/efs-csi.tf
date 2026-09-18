#
# EFS CSI driver on the dev-use2-cstmr-2 cluster.
#
# S3 Files cannot be mounted with a plain NFS volume: the service requires TLS
# and IAM on every connection, and rejects an unauthenticated mount outright
# ("access denied by server" on a direct `mount -t nfs4` to the mount target).
# efs-proxy, shipped in the driver, is what terminates TLS and signs requests,
# so the driver is the only supported path to a mount.
#
# The driver is installed as an EKS add-on and authenticates with EKS Pod
# Identity: the add-on creates the associations for its own service accounts,
# so there is no OIDC provider or IRSA annotation to manage.
#
# NOTE: the cluster itself is managed by cloud-terraform-aws-region. This
# add-on is created from this state, which is why `terraform destroy` here
# removes it again. The upstream module does not prune add-ons it doesn't
# declare, so the two states coexist.
#

variable "eks_cluster_name" {
  description = "Cluster the EFS CSI driver add-on is installed on."
  type        = string
  default     = "dev-use2-cstmr-2"
}

variable "efs_csi_addon_version" {
  description = "EFS CSI driver add-on version. S3 Files support starts at v3.0.0."
  type        = string
  default     = "v3.4.2-eksbuild.1"
}

data "aws_eks_cluster" "this" {
  name = var.eks_cluster_name
}

locals {
  pod_identity_trust = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowEksAuthToAssumeRoleForPodIdentity"
      Effect    = "Allow"
      Principal = { Service = "pods.eks.amazonaws.com" }
      Action    = ["sts:AssumeRole", "sts:TagSession"]
    }]
  })
}

#
# Controller role — watches workloads and manages the file system side.
#
resource "aws_iam_role" "efs_csi_controller" {
  name_prefix        = "s3files-demo-csi-ctrl-"
  assume_role_policy = local.pod_identity_trust
}

resource "aws_iam_role_policy_attachment" "efs_csi_controller" {
  for_each = toset([
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonS3FilesCSIDriverPolicy",
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonS3FilesClientFullAccess",
  ])

  role       = aws_iam_role.efs_csi_controller.name
  policy_arn = each.value
}

#
# Node role — performs the mount. AmazonS3ReadOnlyAccess is what lets the node
# stream large reads straight from the bucket instead of through the file
# system, and AmazonElasticFileSystemsUtils ships efs-utils logs to CloudWatch,
# which is the only useful signal when a mount fails.
#
resource "aws_iam_role" "efs_csi_node" {
  name_prefix        = "s3files-demo-csi-node-"
  assume_role_policy = local.pod_identity_trust
}

resource "aws_iam_role_policy_attachment" "efs_csi_node" {
  for_each = toset([
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonS3FilesClientFullAccess",
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonS3ReadOnlyAccess",
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonElasticFileSystemsUtils",
  ])

  role       = aws_iam_role.efs_csi_node.name
  policy_arn = each.value
}

resource "aws_eks_addon" "efs_csi" {
  cluster_name  = data.aws_eks_cluster.this.name
  addon_name    = "aws-efs-csi-driver"
  addon_version = var.efs_csi_addon_version

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  pod_identity_association {
    role_arn        = aws_iam_role.efs_csi_controller.arn
    service_account = "efs-csi-controller-sa"
  }

  pod_identity_association {
    role_arn        = aws_iam_role.efs_csi_node.arn
    service_account = "efs-csi-node-sa"
  }

  depends_on = [
    aws_iam_role_policy_attachment.efs_csi_controller,
    aws_iam_role_policy_attachment.efs_csi_node,
  ]
}

output "efs_csi_addon_version" {
  description = "Installed EFS CSI driver add-on version."
  value       = aws_eks_addon.efs_csi.addon_version
}

output "efs_csi_role_arns" {
  description = "Pod Identity roles backing the driver's service accounts."
  value = {
    controller = aws_iam_role.efs_csi_controller.arn
    node       = aws_iam_role.efs_csi_node.arn
  }
}
