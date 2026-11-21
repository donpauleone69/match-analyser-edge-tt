import type { ListModel } from '../models'
import { rowStyle } from './rowStyle'

export function RowBlock(model: ListModel) {
  return `${rowStyle} ${model.n}`
}
