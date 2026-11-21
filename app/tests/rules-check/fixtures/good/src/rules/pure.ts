// window
// import { useState } from 'react'
/* document */

const link = 'https://example.com'

export function add(a: number, b: number) {
  return a + b + link.length
}

export function isSettled() {
  return false
}

export function deriveMarkState() {
  return 'off'
}
