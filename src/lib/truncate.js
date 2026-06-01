//write truncate function that takes a string and a max length and returns the string truncated to the max length with "..." at the end if it was truncated
export function truncate(str, maxLength) {
  if (str.length > maxLength) {
    return str.slice(0, maxLength - 3) + '...'
  }
  return str
}
