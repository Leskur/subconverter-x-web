export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const rand = (Math.random() * 16) | 0
    const val = ch === 'x' ? rand : (rand & 0x3) | 0x8
    return val.toString(16)
  })
}
