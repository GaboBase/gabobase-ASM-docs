terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "4.51.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Enable APIs
resource "google_project_service" "run" {
  service = "run.googleapis.com"
}

resource "google_project_service" "vpcaccess" {
  service = "vpcaccess.googleapis.com"
}

# 2. VPC Network
resource "google_compute_network" "asm_network" {
  name = "asm-swarm-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "asm_subnet" {
  name          = "asm-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.asm_network.id
}

# 3. VPC Connector (Serverless VPC Access)
resource "google_vpc_access_connector" "connector" {
  name          = "asm-connector"
  subnet {
    name = google_compute_subnetwork.asm_subnet.name
  }
  machine_type = "e2-micro"
  min_instances = 2
  max_instances = 10
}

# 4. Cloud Run Service (ASM Host)
resource "google_cloud_run_service" "asm_host" {
  name     = "asm-swarm-host"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/asm-core:latest"
        
        env {
          name = "NOTION_API_KEY"
          value_from {
            secret_key_ref {
              name = "notion-api-key"
              key  = "latest"
            }
          }
        }
        
        env {
          name = "NOTION_AGENT_DB_ID"
          value_from {
            secret_key_ref {
              name = "notion-agent-db-id"
              key  = "latest"
            }
          }
        }

        env {
          name = "GOOGLE_PROJECT_ID"
          value = var.project_id
        }
      }
    }

    metadata {
      annotations = {
        # Connect to VPC
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.name
        "run.googleapis.com/vpc-access-egress"    = "all-traffic"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}