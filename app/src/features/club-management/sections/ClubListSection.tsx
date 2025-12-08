/**
 * Club List Section
 * 
 * Displays list of all clubs with search and actions
 */

import { 
  Button, 
  Input, 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Icon,
} from '@/ui-mine'
import type { DBClub } from '@/data'
import { useState } from 'react'

export interface ClubListSectionProps {
  clubs: DBClub[]
  onEdit: (club: DBClub) => void
  onDelete: (clubId: string) => void
}

export function ClubListSection({ clubs, onEdit, onDelete }: ClubListSectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (club.city?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )
  
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search clubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">
          {filteredClubs.length} {filteredClubs.length === 1 ? 'club' : 'clubs'}
        </Badge>
      </div>
      
      {/* Table */}
      {filteredClubs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm ? 'No clubs found matching your search' : 'No clubs yet'}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell className="font-medium">{club.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {club.city || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(club)}
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(club.id)}
                      >
                        <Icon name="trash" className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

