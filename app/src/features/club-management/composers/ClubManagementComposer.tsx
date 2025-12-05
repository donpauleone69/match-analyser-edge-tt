/**
 * Club Management Composer
 * 
 * Orchestrates club management workflow with list and form
 */

import { useState, useEffect } from 'react'
import { ClubListSection } from '../sections/ClubListSection'
import { ClubFormSection } from '../sections/ClubFormSection'
import { 
  Button, 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Icon,
} from '@/ui-mine'
import type { DBClub, NewClub } from '@/data'
import { useClubStore } from '@/data'

// Alert Dialog not yet in ui-mine, so import directly for now
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ClubManagementComposer() {
  const { clubs, isLoading, load, create, update, delete: deleteClub } = useClubStore()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClub, setEditingClub] = useState<DBClub | null>(null)
  const [deletingClubId, setDeletingClubId] = useState<string | null>(null)
  
  // Load clubs
  useEffect(() => {
    load()
  }, [load])
  
  const handleCreate = () => {
    setEditingClub(null)
    setIsFormOpen(true)
  }
  
  const handleEdit = (club: DBClub) => {
    setEditingClub(club)
    setIsFormOpen(true)
  }
  
  const handleSave = async (data: NewClub) => {
    if (editingClub) {
      await update(editingClub.id, data)
    } else {
      await create(data)
    }
    
    setIsFormOpen(false)
    setEditingClub(null)
  }
  
  const handleCancelForm = () => {
    setIsFormOpen(false)
    setEditingClub(null)
  }
  
  const handleDeleteConfirm = async () => {
    if (!deletingClubId) return
    
    try {
      await deleteClub(deletingClubId)
      setDeletingClubId(null)
    } catch (error) {
      console.error('Failed to delete club:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete club')
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading clubs...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clubs</h1>
          <p className="text-muted-foreground">Manage table tennis clubs</p>
        </div>
        <Button onClick={handleCreate}>
          <Icon name="plus" className="h-4 w-4 mr-2" />
          New Club
        </Button>
      </div>
      
      {/* Club List */}
      <ClubListSection
        clubs={clubs}
        onEdit={handleEdit}
        onDelete={(id) => setDeletingClubId(id)}
      />
      
      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClub ? 'Edit Club' : 'New Club'}
            </DialogTitle>
          </DialogHeader>
          <ClubFormSection
            club={editingClub}
            onSave={handleSave}
            onCancel={handleCancelForm}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog 
        open={deletingClubId !== null} 
        onOpenChange={(open) => !open && setDeletingClubId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Club?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The club will be permanently deleted.
              {deletingClubId && clubs.find(c => c.id === deletingClubId)?.name && (
                <span className="block mt-2 font-medium">
                  Club: {clubs.find(c => c.id === deletingClubId)?.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

