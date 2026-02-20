export function isValidPhoneNumber(value) {
  const phone = String(value || '').trim()
  return /^\d{10}$/.test(phone)
}
