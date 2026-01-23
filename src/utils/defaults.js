/**
 * Default value utilities
 */

/**
 * Apply default values from a schema to data
 * @param {object} data - Data to apply defaults to
 * @param {object} schema - Schema definition
 * @returns {object} Data with defaults applied
 */
export function applySchemaDefaults(data, schema) {
  if (!schema || !schema.fields) {
    return data
  }

  return applyFieldDefaults(data, schema.fields)
}

/**
 * Recursively apply defaults to fields
 */
function applyFieldDefaults(data, fields) {
  // Start with data or empty object
  const result = { ...data }

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const hasValue = result[fieldName] !== undefined && result[fieldName] !== null

    // Apply default if no value and default exists
    if (!hasValue && fieldDef.default !== undefined) {
      result[fieldName] = fieldDef.default
    }

    // Handle nested objects
    if (fieldDef.type === 'object' && fieldDef.fields) {
      if (result[fieldName] || hasDefaultsInFields(fieldDef.fields)) {
        result[fieldName] = applyFieldDefaults(result[fieldName] || {}, fieldDef.fields)
      }
    }

    // Handle arrays with object items that have defaults
    if (fieldDef.type === 'array' && fieldDef.items?.fields && Array.isArray(result[fieldName])) {
      result[fieldName] = result[fieldName].map(item =>
        applyFieldDefaults(item, fieldDef.items.fields)
      )
    }
  }

  return result
}

/**
 * Check if any fields have defaults
 */
function hasDefaultsInFields(fields) {
  return Object.values(fields).some(f =>
    f.default !== undefined ||
    (f.type === 'object' && f.fields && hasDefaultsInFields(f.fields))
  )
}

/**
 * Get all default values from a schema as a flat object
 * @param {object} schema - Schema definition
 * @returns {object} Object with all defaults
 */
export function getSchemaDefaults(schema) {
  if (!schema || !schema.fields) {
    return {}
  }

  return extractDefaults(schema.fields)
}

/**
 * Extract defaults from fields
 */
function extractDefaults(fields) {
  const defaults = {}

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (fieldDef.default !== undefined) {
      defaults[fieldName] = fieldDef.default
    }

    if (fieldDef.type === 'object' && fieldDef.fields) {
      const nestedDefaults = extractDefaults(fieldDef.fields)
      if (Object.keys(nestedDefaults).length > 0) {
        defaults[fieldName] = nestedDefaults
      }
    }
  }

  return defaults
}

export default applySchemaDefaults
