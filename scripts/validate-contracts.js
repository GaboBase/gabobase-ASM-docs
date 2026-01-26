#!/usr/bin/env node
/**
 * Validates agent contracts in PRs
 * Ensures all required fields are present and valid
 */

const fs = require('fs').promises;
const path = require('path');

const REQUIRED_FIELDS = [
  'AgentID',
  'Name',
  'Category',
  'Role',
  'AutonomyLevel',
  'Status',
];

const VALID_CATEGORIES = [
  'Core Orchestration',
  'AI/ML',
  'Web Development',
  'Data Engineering',
  'Security',
  'DevOps',
  'Content',
  'Business Intelligence',
];

const VALID_ROLES = ['Orchestrator', 'Specialist', 'Worker', 'Monitor'];

const VALID_AUTONOMY_LEVELS = [
  'Level 1 - Supervised',
  'Level 2 - Semi-Autonomous',
  'Level 3 - Autonomous',
  'Level 4 - Self-Improving',
];

async function validateContract(contractPath) {
  console.log(`🔍 Validating contract: ${contractPath}`);
  
  try {
    const content = await fs.readFile(contractPath, 'utf-8');
    const contract = JSON.parse(content);

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!contract[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(contract.Category)) {
      throw new Error(`Invalid category: ${contract.Category}`);
    }

    // Validate role
    if (!VALID_ROLES.includes(contract.Role)) {
      throw new Error(`Invalid role: ${contract.Role}`);
    }

    // Validate autonomy level
    if (!VALID_AUTONOMY_LEVELS.includes(contract.AutonomyLevel)) {
      throw new Error(`Invalid autonomy level: ${contract.AutonomyLevel}`);
    }

    // Validate trigger conditions if present
    if (contract.TriggerConditions) {
      try {
        const triggers = JSON.parse(contract.TriggerConditions);
        if (!triggers.trigger || !triggers.actions) {
          throw new Error('Trigger conditions must have trigger and actions');
        }
      } catch (e) {
        throw new Error(`Invalid trigger conditions JSON: ${e.message}`);
      }
    }

    console.log('✅ Contract validation passed!');
    return true;
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    return false;
  }
}

async function main() {
  const contractsDir = path.join(__dirname, '..', 'contracts');
  
  try {
    const files = await fs.readdir(contractsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    let allValid = true;
    for (const file of jsonFiles) {
      const valid = await validateContract(path.join(contractsDir, file));
      if (!valid) allValid = false;
    }

    if (!allValid) {
      console.error('❌ Some contracts failed validation');
      process.exit(1);
    }

    console.log('🎉 All contracts validated successfully!');
  } catch (error) {
    console.error('❌ Validation error:', error);
    process.exit(1);
  }
}

main();