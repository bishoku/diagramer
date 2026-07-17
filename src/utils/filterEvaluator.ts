import { FilterAST, FilterOperator, FilterRule } from '../adapters/types';

/**
 * Evaluates a given FilterAST against a set of attributes.
 */
export const evaluateFilterAST = (attributes: Record<string, any>, ast?: FilterAST): boolean => {
  if (!ast || !ast.rules || ast.rules.length === 0) {
    return true; // No filter, matches everything
  }

  const evaluateRule = (rule: FilterRule): boolean => {
    let attributeValue = attributes[rule.field];

    // Handle missing attributes
    if (attributeValue === undefined || attributeValue === null) {
      if (rule.operator === '!=') return true;
      if (rule.operator === 'not_contains') return true;
      if (rule.operator === 'not_in') return true;
      return false; // If the field is missing, equality or comparison usually fails
    }

    const value = rule.value;
    const isArrayValue = Array.isArray(value);

    switch (rule.operator) {
      case '=':
        return String(attributeValue) === String(value);
      case '!=':
        return String(attributeValue) !== String(value);
      case '>':
        return Number(attributeValue) > Number(value);
      case '<':
        return Number(attributeValue) < Number(value);
      case '>=':
        return Number(attributeValue) >= Number(value);
      case '<=':
        return Number(attributeValue) <= Number(value);
      case 'in':
        if (isArrayValue) return (value as any[]).map(String).includes(String(attributeValue));
        return String(attributeValue) === String(value);
      case 'not_in':
        if (isArrayValue) return !(value as any[]).map(String).includes(String(attributeValue));
        return String(attributeValue) !== String(value);
      case 'contains': {
        const attrStr = String(attributeValue).toLowerCase();
        if (isArrayValue) return (value as any[]).some(v => attrStr.includes(String(v).toLowerCase()));
        return attrStr.includes(String(value).toLowerCase());
      }
      case 'not_contains': {
        const attrStr = String(attributeValue).toLowerCase();
        if (isArrayValue) return !(value as any[]).some(v => attrStr.includes(String(v).toLowerCase()));
        return !attrStr.includes(String(value).toLowerCase());
      }
      default:
        return false;
    }
  };

  if (ast.logicalOperator === 'AND') {
    return ast.rules.every(evaluateRule);
  } else {
    // OR logic
    return ast.rules.some(evaluateRule);
  }
};

/**
 * Parses a simple expression string into a FilterAST.
 */
export const parseFilterExpression = (expression: string): FilterAST | null => {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  // Detect logical operator
  const isOr = trimmed.toUpperCase().includes(' OR ');
  const logicalOperator: 'AND' | 'OR' = isOr ? 'OR' : 'AND';

  // Split by logical operator
  const splitRegex = isOr ? /\s+OR\s+/i : /\s+AND\s+/i;
  const ruleStrings = trimmed.split(splitRegex);

  const rules: FilterRule[] = [];

  const operatorRegex = /\s+(not_contains|contains|not_in|in|>=|<=|!=|=|>|<)\s+/;

  ruleStrings.forEach(ruleStr => {
    const parts = ruleStr.split(operatorRegex);
    if (parts.length >= 3) {
      const field = parts[0].trim();
      const operator = parts[1].trim() as FilterOperator;
      let valueStr = parts.slice(2).join('').trim();
      let value: any = valueStr;

      if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        const inner = valueStr.substring(1, valueStr.length - 1);
        value = inner.split(',').map(v => {
          let vTrim = v.trim();
          if ((vTrim.startsWith('"') && vTrim.endsWith('"')) || (vTrim.startsWith("'") && vTrim.endsWith("'"))) {
             vTrim = vTrim.substring(1, vTrim.length - 1);
          }
          if (vTrim.toLowerCase() === 'true') return true;
          if (vTrim.toLowerCase() === 'false') return false;
          if (!isNaN(Number(vTrim)) && vTrim !== '') return Number(vTrim);
          return vTrim;
        });
      } else {
        if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || 
            (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
          valueStr = valueStr.substring(1, valueStr.length - 1);
        }

        if (valueStr.toLowerCase() === 'true') value = true;
        else if (valueStr.toLowerCase() === 'false') value = false;
        else if (!isNaN(Number(valueStr)) && valueStr !== '') value = Number(valueStr);
        else value = valueStr;
      }

      rules.push({
        id: crypto.randomUUID(),
        field,
        operator,
        value
      });
    }
  });

  if (rules.length === 0) return null;

  return {
    logicalOperator,
    rules
  };
};

/**
 * Converts a FilterAST back to a simple string expression.
 */
export const astToExpression = (ast?: FilterAST): string => {
  if (!ast || !ast.rules || ast.rules.length === 0) return '';
  
  const ruleStrings = ast.rules.map(rule => {
    let valueStr = '';
    if (Array.isArray(rule.value)) {
      const formattedArray = rule.value.map(v => typeof v === 'string' ? `"${v}"` : String(v)).join(', ');
      valueStr = `[${formattedArray}]`;
    } else {
      valueStr = typeof rule.value === 'string' ? `"${rule.value}"` : String(rule.value);
    }
    return `${rule.field} ${rule.operator} ${valueStr}`;
  });

  return ruleStrings.join(` ${ast.logicalOperator} `);
};
