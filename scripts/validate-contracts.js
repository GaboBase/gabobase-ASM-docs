#!/usr/bin/env node

/**
 * Agent Contract Validation Script
 * 
 * Validates agent contract definitions against schema
 * Ensures trigger conditions, tool schemas, and execution patterns are well-formed
 * 
 * Usage:
 *   node scripts/validate-contracts.js [--file=path/to/contract.json] [--all]
 * 
 * Exit codes:
 *   0 - All contracts valid
 *   1 - Validation errors found
 */

const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Configuration
const CONFIG = {
  contractsDir: './contracts',
  schemaPath: './schemas/agent-contract.schema.json',
  file: getArgValue('--file'),
  validateAll: process.argv.includes('--all'),
  verbose: process.argv.includes('--verbose')
};

// Agent Contract JSON Schema
const AGENT_CONTRACT_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Agent Contract",
  "type": "object",
  "required": ["name", "version", "category", "executionPattern", "triggerConditions", "toolSchema"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "pattern": "^[A-Za-z0-9_\\- ]+$"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "category": {
      "type": "string",
      "enum": [
        "Reasoning", "Generation", "Specialized", "Code", 
        "Knowledge", "Coordination", "Monitoring", "Other"
      ]
    },
    "status": {
      "type": "string",
      "enum": ["Active", "Beta", "Alpha", "Development", "Planned", "Deprecated"]
    },
    "executionPattern": {
      "type": "string",
      "enum": ["BFS", "Recursive", "Parallel", "Hybrid", "Sequential"]
    },
    "architectures": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "EC-RAG", "MCP-Swarm", "RCOP", "MetaReasoner", 
          "GenOps", "FLSIN", "HMMAF", "DCE"
        ]
      }
    },
    "mcpEnabled": {
      "type": "boolean"
    },
    "costTier": {
      "type": "string",
      "enum": ["Low", "Medium", "High"]
    },
    "priority": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10
    },
    "description": {
      "type": "string",
      "minLength": 10,
      "maxLength": 1000
    },
    "triggerConditions": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["manual", "event", "conditional", "scheduled"]
        },
        "event": {
          "type": "string"
        },
        "condition": {
          "type": "object",
          "required": ["expression"],
          "properties": {
            "expression": {"type": "string"},
            "variables": {"type": "object"}
          }
        },
        "schedule": {
          "type": "string",
          "pattern": "^(@(annually|yearly|monthly|weekly|daily|hourly))|(((\\*|\\?|\\d+((\\/|\\-){0,1}(\\d+))*)\\s*){5,6})$"
        }
      }
    },
    "toolSchema": {
      "type": "object",
      "required": ["input", "output"],
      "properties": {
        "input": {
          "type": "object",
          "properties": {
            "parameters": {"type": "object"},
            "required": {
              "type": "array",
              "items": {"type": "string"}
            }
          }
        },
        "output": {
          "type": "object",
          "properties": {
            "format": {"type": "string"},
            "schema": {"type": "object"}
          }
        }
      }
    },
    "integrationPoints": {
      "type": "array",
      "items": {"type": "string"}
    },
    "knowledgeSources": {
      "type": "array",
      "items": {"type": "string"}
    },
    "dependencies": {
      "type": "array",
      "items": {"type": "string"}
    },
    "performance": {
      "type": "object",
      "properties": {
        "avgLatency": {"type": "string"},
        "successRate": {"type": "number", "minimum": 0, "maximum": 1},
        "throughput": {"type": "string"}
      }
    }
  }
};

// Initialize JSON Schema validator
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);
const validate = ajv.compile(AGENT_CONTRACT_SCHEMA);

// Logging
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  debug: (msg) => CONFIG.verbose && console.log(`🔍 ${msg}`)
};

/**
 * Validate a single agent contract
 */
function validateContract(contract, filename) {
  const errors = [];
  
  // JSON Schema validation
  const valid = validate(contract);
  if (!valid) {
    validate.errors.forEach(err => {
      errors.push({
        type: 'schema',
        path: err.instancePath || 'root',
        message: err.message,
        details: err.params
      });
    });
  }
  
  // Custom business logic validations
  
  // 1. Validate trigger condition consistency
  if (contract.triggerConditions) {
    const tc = contract.triggerConditions;
    
    if (tc.type === 'event' && !tc.event) {
      errors.push({
        type: 'business',
        path: 'triggerConditions',
        message: 'Event type trigger must specify an event'
      });
    }
    
    if (tc.type === 'conditional' && !tc.condition) {
      errors.push({
        type: 'business',
        path: 'triggerConditions',
        message: 'Conditional trigger must specify a condition'
      });
    }
    
    if (tc.type === 'scheduled' && !tc.schedule) {
      errors.push({
        type: 'business',
        path: 'triggerConditions',
        message: 'Scheduled trigger must specify a schedule (cron format)'
      });
    }
  }
  
  // 2. Validate tool schema completeness
  if (contract.toolSchema) {
    if (!contract.toolSchema.input || !contract.toolSchema.input.parameters) {
      errors.push({
        type: 'business',
        path: 'toolSchema.input',
        message: 'Tool schema must define input parameters'
      });
    }
    
    if (!contract.toolSchema.output || !contract.toolSchema.output.format) {
      errors.push({
        type: 'business',
        path: 'toolSchema.output',
        message: 'Tool schema must define output format'
      });
    }
  }
  
  // 3. Validate architecture dependencies
  if (contract.mcpEnabled && !contract.architectures?.includes('MCP-Swarm')) {
    errors.push({
      type: 'business',
      path: 'architectures',
      message: 'MCP-enabled agents must include MCP-Swarm in architectures'
    });
  }
  
  // 4. Validate execution pattern compatibility
  const recursivePatterns = ['Recursive', 'Hybrid'];
  if (recursivePatterns.includes(contract.executionPattern) && 
      !contract.architectures?.includes('RCOP')) {
    errors.push({
      type: 'warning',
      path: 'executionPattern',
      message: `${contract.executionPattern} pattern typically requires RCOP architecture`
    });
  }
  
  // 5. Validate priority and cost tier alignment
  if (contract.priority >= 8 && contract.costTier === 'Low') {
    errors.push({
      type: 'warning',
      path: 'costTier',
      message: 'High-priority agents (8+) are rarely Low cost - verify this is intentional'
    });
  }
  
  return {
    filename,
    valid: errors.filter(e => e.type !== 'warning').length === 0,
    errors: errors.filter(e => e.type !== 'warning'),
    warnings: errors.filter(e => e.type === 'warning')
  };
}

/**
 * Validate all contracts in directory
 */
async function validateAllContracts() {
  log.info(`Validating contracts in ${CONFIG.contractsDir}...`);
  
  const files = await fs.readdir(CONFIG.contractsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    log.warn(`No contract files found in ${CONFIG.contractsDir}`);
    return { valid: true, results: [] };
  }
  
  const results = [];
  
  for (const file of jsonFiles) {
    const filePath = path.join(CONFIG.contractsDir, file);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const contract = JSON.parse(content);
      
      log.debug(`Validating ${file}...`);
      const result = validateContract(contract, file);
      results.push(result);
      
    } catch (error) {
      results.push({
        filename: file,
        valid: false,
        errors: [{
          type: 'parse',
          path: 'root',
          message: `Failed to parse JSON: ${error.message}`
        }],
        warnings: []
      });
    }
  }
  
  return {
    valid: results.every(r => r.valid),
    results
  };
}

/**
 * Validate a single contract file
 */
async function validateSingleContract(filePath) {
  log.info(`Validating contract: ${filePath}`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const contract = JSON.parse(content);
    
    const result = validateContract(contract, path.basename(filePath));
    
    return {
      valid: result.valid,
      results: [result]
    };
    
  } catch (error) {
    return {
      valid: false,
      results: [{
        filename: path.basename(filePath),
        valid: false,
        errors: [{
          type: 'parse',
          path: 'root',
          message: `Failed to parse JSON: ${error.message}`
        }],
        warnings: []
      }]
    };
  }
}

/**
 * Print validation results
 */
function printResults(validation) {
  console.log('\n=== Validation Results ===\n');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  validation.results.forEach(result => {
    if (result.valid && result.warnings.length === 0) {
      log.success(`${result.filename} - Valid`);
    } else {
      if (result.errors.length > 0) {
        log.error(`${result.filename} - ${result.errors.length} error(s)`);
        result.errors.forEach(err => {
          console.log(`  ❌ ${err.path}: ${err.message}`);
          if (CONFIG.verbose && err.details) {
            console.log(`     Details: ${JSON.stringify(err.details)}`);
          }
        });
        totalErrors += result.errors.length;
      }
      
      if (result.warnings.length > 0) {
        log.warn(`${result.filename} - ${result.warnings.length} warning(s)`);
        result.warnings.forEach(warn => {
          console.log(`  ⚠️  ${warn.path}: ${warn.message}`);
        });
        totalWarnings += result.warnings.length;
      }
    }
  });
  
  console.log('\n=== Summary ===');
  console.log(`Total Contracts: ${validation.results.length}`);
  console.log(`Valid: ${validation.results.filter(r => r.valid).length}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Warnings: ${totalWarnings}`);
  
  if (validation.valid) {
    log.success('\nAll contracts are valid! 🎉');
  } else {
    log.error('\nValidation failed - please fix errors above');
  }
}

/**
 * Utility function to extract command-line argument values
 */
function getArgValue(argName) {
  const arg = process.argv.find(a => a.startsWith(argName));
  if (!arg) return null;
  const [, value] = arg.split('=');
  return value;
}

/**
 * Main function
 */
async function main() {
  try {
    let validation;
    
    if (CONFIG.file) {
      validation = await validateSingleContract(CONFIG.file);
    } else if (CONFIG.validateAll) {
      validation = await validateAllContracts();
    } else {
      log.error('Please specify --file=path or --all');
      console.log('\nUsage:');
      console.log('  node scripts/validate-contracts.js --file=path/to/contract.json');
      console.log('  node scripts/validate-contracts.js --all');
      console.log('  node scripts/validate-contracts.js --all --verbose');
      process.exit(1);
    }
    
    printResults(validation);
    
    process.exit(validation.valid ? 0 : 1);
    
  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    if (CONFIG.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateContract, AGENT_CONTRACT_SCHEMA };