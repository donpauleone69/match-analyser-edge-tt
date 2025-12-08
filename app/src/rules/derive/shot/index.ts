/**
 * Shot-Level Derivations
 * 
 * Functions that derive shot table fields from input data (100% deterministic)
 */

// Export from deriveShot_locations (prefer new names)
export {
  deriveShot_locations,
  extractTargetFromDirection,
  // Deprecated, but still exported for backward compatibility
  extractDestinationFromDirection,
} from './deriveShot_locations'

export * from './deriveShot_rally_end_role'

// Export from mappers (avoid duplicate deprecated exports)
export {
  mapDirectionToOriginTarget,
  mapShotLengthUIToDB,
  mapShotLengthDBToUI,
  mapServeSpinUIToDB,
  mapServeSpinDBToUI,
  mapStrokeUIToDB,
  mapWingDBToUI,
  mapShotQualityUIToDB,
  mapShotResultDBToUI,
  mapErrorTypeUIToDB,
  mapRallyEndRoleDBToUI,
  mapIntentUIToDB,
  mapPlayerUIToDB,
  mapPlayerDBToUI,
  extractTargetFromDirection as extractTargetFromDirection_Mapper,
  mapOriginTargetToDirection,
  // Deprecated exports
  mapServeLengthUIToDB,
  mapServeLengthDBToUI,
  mapDirectionToOriginDestination,
  mapOriginDestinationToDirection,
} from './mappers_UI_to_DB'

