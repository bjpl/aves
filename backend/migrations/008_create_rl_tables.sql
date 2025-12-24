-- Migration: Create Reinforcement Learning Tables
-- Purpose: Store learning patterns, rejections, and approvals for ML improvement

-- Learning patterns from position corrections
CREATE TABLE IF NOT EXISTS rl_learning_patterns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  species VARCHAR(255) NOT NULL,
  feature VARCHAR(255) NOT NULL,
  annotation_type ENUM('anatomical', 'behavioral', 'color', 'pattern') NOT NULL,
  original_box JSON NOT NULL COMMENT 'Original bounding box before correction',
  corrected_box JSON NOT NULL COMMENT 'Corrected bounding box after user edit',
  adjustment JSON NOT NULL COMMENT 'Delta values {dx, dy, dwidth, dheight}',
  image_context JSON NOT NULL COMMENT 'Image characteristics for context',
  user_id VARCHAR(255) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL COMMENT 'Original annotation confidence',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_species_feature (species, feature),
  INDEX idx_annotation_type (annotation_type),
  INDEX idx_created_at (created_at),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rejection patterns to identify common issues
CREATE TABLE IF NOT EXISTS rl_rejection_patterns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id VARCHAR(255) NOT NULL,
  annotation_id VARCHAR(255) NOT NULL,
  species VARCHAR(255),
  feature VARCHAR(255) NOT NULL,
  annotation_type ENUM('anatomical', 'behavioral', 'color', 'pattern') NOT NULL,
  rejection_reason TEXT NOT NULL,
  rejection_category VARCHAR(100) COMMENT 'Categorized rejection reason',
  bounding_box JSON NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_job_id (job_id),
  INDEX idx_annotation_id (annotation_id),
  INDEX idx_species (species),
  INDEX idx_feature (feature),
  INDEX idx_rejection_category (rejection_category),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Approval patterns to identify successful annotations
CREATE TABLE IF NOT EXISTS rl_approvals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  annotation_id VARCHAR(255) NOT NULL,
  job_id VARCHAR(255) NOT NULL,
  species VARCHAR(255),
  feature VARCHAR(255) NOT NULL,
  annotation_type ENUM('anatomical', 'behavioral', 'color', 'pattern') NOT NULL,
  bounding_box JSON NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_annotation_id (annotation_id),
  INDEX idx_job_id (job_id),
  INDEX idx_species_feature (species, feature),
  INDEX idx_confidence (confidence),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Neural model training metadata
CREATE TABLE IF NOT EXISTS rl_neural_training (
  id INT PRIMARY KEY AUTO_INCREMENT,
  model_type VARCHAR(100) NOT NULL,
  training_samples INT NOT NULL,
  accuracy DECIMAL(5,4),
  loss DECIMAL(10,6),
  epochs INT NOT NULL,
  parameters JSON COMMENT 'Training hyperparameters',
  performance_metrics JSON COMMENT 'Validation metrics',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_model_type (model_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comments for documentation
ALTER TABLE rl_learning_patterns COMMENT = 'Stores user corrections to learn optimal positioning patterns';
ALTER TABLE rl_rejection_patterns COMMENT = 'Tracks rejected annotations to identify and prevent common issues';
ALTER TABLE rl_approvals COMMENT = 'Records approved annotations as positive reinforcement examples';
ALTER TABLE rl_neural_training COMMENT = 'Metadata for neural network training sessions';
