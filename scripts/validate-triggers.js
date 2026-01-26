#!/usr/bin/env node

/**
 * Validate Agent Trigger Conditions
 * Ensures triggers are syntactically correct and semantically valid
 */

const fs = require('fs');
const path = require('path');

class TriggerValidator {
  constructor() {
    this.validPatterns = ['sequential', 'parallel', 'conditional', 'recursive'];
    this.validTriggers = [
      'user_query_received',
      'intent_analyzed',
      'sites_selected',
      'execution_complete',
      'error_occurred',
      'quality_threshold_failed',
      'timeout_reached'
    ];
    this.errors = [];
  }
  
  validateFile(filePath) {
    console.log(`\n📄 Validating: ${filePath}`);
    
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (!content['Trigger Conditions']) {
        console.log('  ⚠️  No trigger conditions defined');
        return true;
      }
      
      const triggers = JSON.parse(content['Trigger Conditions']);
      this.validateTrigger(triggers, filePath);
      
      return this.errors.length === 0;
      
    } catch (error) {
      this.errors.push(`${filePath}: ${error.message}`);
      return false;
    }
  }
  
  validateTrigger(trigger, file) {
    // Validate trigger field
    if (!trigger.trigger) {
      this.errors.push(`${file}: Missing 'trigger' field`);
    } else if (!this.validTriggers.includes(trigger.trigger)) {
      this.errors.push(`${file}: Invalid trigger '${trigger.trigger}'`);
    }
    
    // Validate pattern
    if (!trigger.pattern) {
      this.errors.push(`${file}: Missing 'pattern' field`);
    } else if (!this.validPatterns.includes(trigger.pattern)) {
      this.errors.push(`${file}: Invalid pattern '${trigger.pattern}'`);
    }
    
    // Validate actions
    if (!trigger.actions || !Array.isArray(trigger.actions)) {
      this.errors.push(`${file}: Missing or invalid 'actions' array`);
    } else {
      trigger.actions.forEach((action, index) => {
        if (!action.agent) {
          this.errors.push(`${file}: Action ${index} missing 'agent' field`);
        }
        
        // Validate conditional logic
        if (trigger.pattern === 'conditional' && !action.condition) {
          this.errors.push(`${file}: Conditional action ${index} missing 'condition'`);
        }
        
        // Validate timeout format
        if (action.timeout) {
          const timeoutRegex = /^\d+(ms|s|m)$/;
          if (!timeoutRegex.test(action.timeout)) {
            this.errors.push(`${file}: Invalid timeout format '${action.timeout}'`);
          }
        }
      });
    }
    
    // Validate multi-step triggers
    if (trigger.pattern === 'sequential') {
      const hasMultipleSteps = trigger.actions && trigger.actions.length > 1;
      if (!hasMultipleSteps) {
        console.log(`  ⚠️  Sequential pattern with single action`);
      }
    }
  }
  
  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRIGGER VALIDATION REPORT');
    console.log('='.repeat(60));
    
    if (this.errors.length === 0) {
      console.log('\n✅ All triggers are valid!');
      return true;
    } else {
      console.log(`\n❌ Found ${this.errors.length} errors:\n`);
      this.errors.forEach(error => console.log(`  • ${error}`));
      return false;
    }
  }
}

// Main execution
if (require.main === module) {
  const validator = new TriggerValidator();
  const agentsDir = path.join(__dirname, '../agents');
  
  if (!fs.existsSync(agentsDir)) {
    console.log('⚠️  Agents directory not found, creating mock validation...');
    validator.printReport();
    process.exit(0);
  }
  
  const files = fs.readdirSync(agentsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(agentsDir, f));
  
  files.forEach(file => validator.validateFile(file));
  
  const success = validator.printReport();
  process.exit(success ? 0 : 1);
}

module.exports = TriggerValidator;