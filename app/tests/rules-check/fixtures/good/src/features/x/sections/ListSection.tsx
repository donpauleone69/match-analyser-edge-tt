import { Icon } from '@/ui-mine/Icon'
import { RowBlock } from '../blocks/RowBlock'
import type { ListModel } from '../models'

export function ListSection(model: ListModel) {
  return [RowBlock(model), Icon]
}
