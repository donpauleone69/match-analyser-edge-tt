/**
 * Club Form Section
 * 
 * Form for creating/editing clubs
 */

import { Button, Input, Label } from '@/ui-mine'
import type { DBClub, NewClub } from '@/data'
import { useState, useEffect } from 'react'

export interface ClubFormSectionProps {
  club?: DBClub | null
  onSave: (data: NewClub) => Promise<void>
  onCancel: () => void
}

export function ClubFormSection({ club, onSave, onCancel }: ClubFormSectionProps) {
  const [formData, setFormData] = useState<NewClub>({
    name: '',
    location: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Load club data if editing
  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name,
        location: club.location,
      })
    }
  }, [club])
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Club name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsSubmitting(true)
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Failed to save club:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save club' })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Club Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Club Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Manchester Table Tennis Club"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>
      
      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location (Optional)</Label>
        <Input
          id="location"
          type="text"
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value || null })}
          placeholder="e.g., Manchester, UK"
        />
      </div>
      
      {/* Submit Error */}
      {errors.submit && (
        <p className="text-sm text-destructive">{errors.submit}</p>
      )}
      
      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : club ? 'Update Club' : 'Create Club'}
        </Button>
      </div>
    </form>
  )
}

