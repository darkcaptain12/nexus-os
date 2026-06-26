import type { ActionDefinition, ActionHandler, ValidationResult } from './types';

export class ActionValidator {
  validate(definition: ActionDefinition, handler: ActionHandler, params: Record<string, unknown>): ValidationResult {
    const errors: { parameter: string; message: string }[] = [];

    if (handler.validate) {
      const handlerResult = handler.validate(params);
      if (!handlerResult.valid) {
        return handlerResult;
      }
    }

    for (const param of definition.parameters) {
      const value = params[param.name];
      if (param.required && (value === undefined || value === null)) {
        errors.push({ parameter: param.name, message: `${param.name} is required` });
        continue;
      }
      if (value !== undefined && value !== null) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== param.type && param.type !== 'object') {
          errors.push({ parameter: param.name, message: `Expected ${param.type}, got ${actualType}` });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
