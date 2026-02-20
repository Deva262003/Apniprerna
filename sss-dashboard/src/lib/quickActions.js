export function isQuickActionAllowed(role, action) {
  if (!action?.roles || action.roles.length === 0) return true
  if (!role) return false
  return action.roles.includes(role)
}

export function filterQuickActionsByRole(actions = [], role = '') {
  return actions.filter((action) => isQuickActionAllowed(role, action))
}
