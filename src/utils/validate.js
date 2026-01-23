/**
 * Schema validation utilities
 */

/**
 * Validate data against a schema
 * @param {object} data - Data to validate
 * @param {object} schema - Schema definition
 * @returns {{ valid: boolean, errors: Array<{ path: string, message: string }> }}
 */
export function validateAgainstSchema(data, schema) {
  const errors = []

  if (!schema || !schema.fields) {
    return { valid: true, errors: [] }
  }

  validateFields(data, schema.fields, '', errors)

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate fields recursively
 */
function validateFields(data, fields, path, errors) {
  if (!data || typeof data !== 'object') {
    if (Object.values(fields).some(f => f.required)) {
      errors.push({
        path: path || '(root)',
        message: 'Expected an object',
      })
    }
    return
  }

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const fieldPath = path ? `${path}.${fieldName}` : fieldName
    const value = data[fieldName]

    // Check required
    if (fieldDef.required && (value === undefined || value === null || value === '')) {
      errors.push({
        path: fieldPath,
        message: 'Required field is missing',
      })
      continue
    }

    // Skip if no value and not required
    if (value === undefined || value === null) {
      continue
    }

    // Type validation
    const typeError = validateType(value, fieldDef, fieldPath)
    if (typeError) {
      errors.push(typeError)
      continue
    }

    // Enum validation
    if (fieldDef.enum && !fieldDef.enum.includes(value)) {
      errors.push({
        path: fieldPath,
        message: `Value must be one of: ${fieldDef.enum.join(', ')}`,
      })
    }

    // Format validation
    if (fieldDef.format) {
      const formatError = validateFormat(value, fieldDef.format, fieldPath)
      if (formatError) {
        errors.push(formatError)
      }
    }

    // Nested object validation
    if (fieldDef.type === 'object' && fieldDef.fields) {
      validateFields(value, fieldDef.fields, fieldPath, errors)
    }

    // Array validation
    if (fieldDef.type === 'array' && fieldDef.items && Array.isArray(value)) {
      value.forEach((item, index) => {
        const itemPath = `${fieldPath}[${index}]`
        if (fieldDef.items.type === 'object' && fieldDef.items.fields) {
          validateFields(item, fieldDef.items.fields, itemPath, errors)
        } else {
          const itemError = validateType(item, fieldDef.items, itemPath)
          if (itemError) {
            errors.push(itemError)
          }
        }
      })
    }
  }
}

/**
 * Validate a value's type
 */
function validateType(value, fieldDef, path) {
  const type = fieldDef.type

  switch (type) {
    case 'string':
    case 'markdown':
    case 'image':
    case 'url':
    case 'email':
    case 'date':
    case 'datetime':
      if (typeof value !== 'string') {
        return { path, message: `Expected string, got ${typeof value}` }
      }
      break

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { path, message: `Expected number, got ${typeof value}` }
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { path, message: `Expected boolean, got ${typeof value}` }
      }
      break

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { path, message: `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}` }
      }
      break

    case 'array':
      if (!Array.isArray(value)) {
        return { path, message: `Expected array, got ${typeof value}` }
      }
      break
  }

  return null
}

/**
 * Validate value format
 */
function validateFormat(value, format, path) {
  if (typeof value !== 'string') return null

  switch (format) {
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { path, message: 'Invalid email format' }
      }
      break

    case 'url':
      try {
        new URL(value)
      } catch {
        // Allow relative URLs
        if (!value.startsWith('/')) {
          return { path, message: 'Invalid URL format' }
        }
      }
      break
  }

  return null
}

export default validateAgainstSchema
