/**
 * Tests for calculateServer — Server Order Engine
 * 
 * These tests verify the pure server calculation logic without any UI or database dependencies.
 */

import { describe, it, expect } from 'vitest'
import { 
  calculateServer, 
  calculateNextServer,
  validateServerSequence,
  willServiceChange,
  servesRemaining,
  calculateSetFirstServer,
} from './calculateServer'

describe('calculateServer', () => {
  describe('Normal play (before deuce)', () => {
    it('should return first server at 0-0', () => {
      const result = calculateServer({
        firstServerId: 'player1',
        player1Score: 0,
        player2Score: 0,
      })
      
      expect(result.serverId).toBe('player1')
      expect(result.receiverId).toBe('player2')
    })
    
    it('should alternate every 2 points', () => {
      // Points 0-1: Player 1 serves
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 0,
        player2Score: 0,
      }).serverId).toBe('player1')
      
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 1,
        player2Score: 0,
      }).serverId).toBe('player1')
      
      // Points 2-3: Player 2 serves
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 1,
        player2Score: 1,
      }).serverId).toBe('player2')
      
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 2,
        player2Score: 1,
      }).serverId).toBe('player2')
      
      // Points 4-5: Player 1 serves again
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 3,
        player2Score: 1,
      }).serverId).toBe('player1')
    })
    
    it('should work correctly when player2 is first server', () => {
      expect(calculateServer({
        firstServerId: 'player2',
        player1Score: 0,
        player2Score: 0,
      }).serverId).toBe('player2')
      
      expect(calculateServer({
        firstServerId: 'player2',
        player1Score: 1,
        player2Score: 1,
      }).serverId).toBe('player1')
    })
  })
  
  describe('Deuce (10-10 or higher)', () => {
    it('should alternate every point at 10-10', () => {
      // At 10-10, should be back to first server (20 points played = 10 service changes)
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 10,
        player2Score: 10,
      }).serverId).toBe('player1')
      
      // At 11-10, should switch
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 11,
        player2Score: 10,
      }).serverId).toBe('player2')
      
      // At 11-11, should switch back
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 11,
        player2Score: 11,
      }).serverId).toBe('player1')
    })
    
    it('should continue alternating at extended deuce', () => {
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 15,
        player2Score: 15,
      }).serverId).toBe('player1')
      
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 16,
        player2Score: 15,
      }).serverId).toBe('player2')
    })
  })
  
  describe('Edge cases', () => {
    it('should handle score 9-9 correctly (not deuce yet)', () => {
      // 18 points played = 9 service changes
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 9,
        player2Score: 9,
      }).serverId).toBe('player1')
    })
    
    it('should handle asymmetric scores approaching deuce', () => {
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 10,
        player2Score: 9,
      }).serverId).toBe('player2')
      
      expect(calculateServer({
        firstServerId: 'player1',
        player1Score: 9,
        player2Score: 10,
      }).serverId).toBe('player2')
    })
  })
})

describe('calculateNextServer', () => {
  it('should calculate server after player1 wins', () => {
    const result = calculateNextServer({
      firstServerId: 'player1',
      player1Score: 0,
      player2Score: 0,
      winnerId: 'player1',
    })
    
    // After 1 point, still player1's serve
    expect(result.serverId).toBe('player1')
  })
  
  it('should calculate server after service change', () => {
    const result = calculateNextServer({
      firstServerId: 'player1',
      player1Score: 1,
      player2Score: 0,
      winnerId: 'player2',
    })
    
    // After 2 points, switches to player2
    expect(result.serverId).toBe('player2')
  })
})

describe('validateServerSequence', () => {
  it('should validate correct server sequence', () => {
    const result = validateServerSequence({
      firstServerId: 'player1',
      rallies: [
        { serverId: 'player1', winnerId: 'player1', isScoring: true },
        { serverId: 'player1', winnerId: 'player2', isScoring: true },
        { serverId: 'player2', winnerId: 'player1', isScoring: true },
        { serverId: 'player2', winnerId: 'player2', isScoring: true },
      ],
    })
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
  
  it('should detect incorrect server assignment', () => {
    const result = validateServerSequence({
      firstServerId: 'player1',
      rallies: [
        { serverId: 'player1', winnerId: 'player1', isScoring: true },
        { serverId: 'player1', winnerId: 'player2', isScoring: true },
        { serverId: 'player1', winnerId: 'player1', isScoring: true }, // Wrong! Should be player2
        { serverId: 'player2', winnerId: 'player2', isScoring: true },
      ],
    })
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toEqual({
      rallyIndex: 2,
      expectedServerId: 'player2',
      actualServerId: 'player1',
    })
  })
  
  it('should handle non-scoring rallies (lets)', () => {
    const result = validateServerSequence({
      firstServerId: 'player1',
      rallies: [
        { serverId: 'player1', isScoring: false }, // Let - no score change
        { serverId: 'player1', winnerId: 'player1', isScoring: true }, // Still player1's serve
        { serverId: 'player1', winnerId: 'player2', isScoring: true },
        { serverId: 'player2', winnerId: 'player1', isScoring: true },
      ],
    })
    
    expect(result.isValid).toBe(true)
  })
})

describe('willServiceChange', () => {
  it('should return false on first serve of block', () => {
    expect(willServiceChange({
      firstServerId: 'player1',
      player1Score: 0,
      player2Score: 0,
    })).toBe(false)
  })
  
  it('should return true on second serve of block', () => {
    expect(willServiceChange({
      firstServerId: 'player1',
      player1Score: 1,
      player2Score: 0,
    })).toBe(true)
  })
  
  it('should return true at deuce (always alternate)', () => {
    expect(willServiceChange({
      firstServerId: 'player1',
      player1Score: 10,
      player2Score: 10,
    })).toBe(true)
  })
})

describe('servesRemaining', () => {
  it('should return 2 at start of service block', () => {
    expect(servesRemaining({
      firstServerId: 'player1',
      player1Score: 0,
      player2Score: 0,
    })).toBe(2)
  })
  
  it('should return 1 on second serve of block', () => {
    expect(servesRemaining({
      firstServerId: 'player1',
      player1Score: 1,
      player2Score: 0,
    })).toBe(1)
  })
  
  it('should return 1 at deuce (always 1 serve)', () => {
    expect(servesRemaining({
      firstServerId: 'player1',
      player1Score: 10,
      player2Score: 10,
    })).toBe(1)
  })
})

describe('calculateSetFirstServer', () => {
  it('should return match first server for odd sets', () => {
    expect(calculateSetFirstServer({
      matchFirstServerId: 'player1',
      setNumber: 1,
    })).toBe('player1')
    
    expect(calculateSetFirstServer({
      matchFirstServerId: 'player1',
      setNumber: 3,
    })).toBe('player1')
    
    expect(calculateSetFirstServer({
      matchFirstServerId: 'player1',
      setNumber: 5,
    })).toBe('player1')
  })
  
  it('should return other player for even sets', () => {
    expect(calculateSetFirstServer({
      matchFirstServerId: 'player1',
      setNumber: 2,
    })).toBe('player2')
    
    expect(calculateSetFirstServer({
      matchFirstServerId: 'player1',
      setNumber: 4,
    })).toBe('player2')
  })
  
  it('should work when player2 is match first server', () => {
    expect(calculateSetFirstServer({
      matchFirstServerId: 'player2',
      setNumber: 1,
    })).toBe('player2')
    
    expect(calculateSetFirstServer({
      matchFirstServerId: 'player2',
      setNumber: 2,
    })).toBe('player1')
  })
})

