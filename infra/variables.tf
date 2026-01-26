variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
  default     = "agent-matrix-swarm-asm-1"
}

variable "region" {
  description = "Google Cloud Region"
  type        = string
  default     = "us-central1"
}

variable "notion_db_id" {
  description = "Notion Agent Registry Database ID"
  type        = string
  default     = "7eb331e9-f7b2-458d-8729-5bfed6471aa0"
}
