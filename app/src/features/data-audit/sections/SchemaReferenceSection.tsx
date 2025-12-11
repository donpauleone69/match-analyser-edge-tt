/**
 * SchemaReferenceSection - Shows prepopulated fields (NOT modified by Phase 1)
 */

import { useState } from 'react'
import { Icon } from '@/ui-mine/Icon'
import type { DBMatch, DBSet, DBRally, DBShot } from '@/data'
import { formatValue } from '../fieldConfig'
import {
  MATCH_PREPOPULATED_FIELDS,
  SET_PREPOPULATED_FIELDS,
  RALLY_PREPOPULATED_FIELDS,
  SHOT_PREPOPULATED_FIELDS,
} from '../fieldConfig'

interface SchemaReferenceSectionProps {
  matchRecord?: DBMatch | null
  sampleSet?: DBSet | null
  sampleRally?: DBRally | null
  sampleShot?: DBShot | null
}

export function SchemaReferenceSection({ 
  matchRecord,
  sampleSet, 
  sampleRally, 
  sampleShot 
}: SchemaReferenceSectionProps) {
  const [expanded, setExpanded] = useState(false)
  
  const totalFields = 
    MATCH_PREPOPULATED_FIELDS.length +
    SET_PREPOPULATED_FIELDS.length + 
    RALLY_PREPOPULATED_FIELDS.length + 
    SHOT_PREPOPULATED_FIELDS.length
  
  return (
    <div className="mb-6 border border-neutral-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 bg-neutral-800 flex items-center justify-between hover:bg-neutral-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon name="info" size="md" className="text-neutral-400" />
          <div className="text-left">
            <div className="font-semibold">Database Schema Reference</div>
            <div className="text-sm text-neutral-500">
              {totalFields} fields NOT modified by Phase 1
            </div>
          </div>
        </div>
        <Icon 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size="sm" 
          className="text-neutral-400" 
        />
      </button>
      
      {expanded && (
        <div className="p-6 bg-neutral-900 space-y-6">
          {/* MATCH TABLE */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-neutral-300">
              📋 MATCH TABLE ({MATCH_PREPOPULATED_FIELDS.length} fields not touched)
            </h3>
            <div className="text-xs text-yellow-400 mb-2 font-semibold">
              ⚠️ Phase 1 does NOT modify the Match table - all fields are prepopulated
            </div>
            {matchRecord && (
              <div className="text-xs text-neutral-400 mb-2 italic">
                Showing actual values from this match
              </div>
            )}
            <div className="overflow-x-auto border border-neutral-700 rounded">
              <table className="min-w-full text-xs">
                <thead className="bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Field</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Default Value</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Actual Value</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {MATCH_PREPOPULATED_FIELDS.map(field => {
                    const actualValue = matchRecord ? (matchRecord as any)[field.key] : undefined
                    return (
                      <tr key={field.key} className="border-t border-neutral-800">
                        <td className="px-3 py-2 font-mono text-neutral-300">{field.key}</td>
                        <td className="px-3 py-2 font-mono text-neutral-500">{field.defaultValue}</td>
                        <td className="px-3 py-2 font-mono text-blue-400">
                          {matchRecord ? formatValue(actualValue) : '—'}
                        </td>
                        <td className="px-3 py-2 text-neutral-400">{field.description}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* SET TABLE */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-neutral-300">
              📋 SET TABLE ({SET_PREPOPULATED_FIELDS.length} fields not touched)
            </h3>
            {sampleSet && (
              <div className="text-xs text-neutral-400 mb-2 italic">
                Showing actual values from Set {sampleSet.set_number}
              </div>
            )}
            <div className="overflow-x-auto border border-neutral-700 rounded">
              <table className="min-w-full text-xs">
                <thead className="bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Field</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Default Value</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Actual Value</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {SET_PREPOPULATED_FIELDS.map(field => {
                    const actualValue = sampleSet ? (sampleSet as any)[field.key] : undefined
                    return (
                      <tr key={field.key} className="border-t border-neutral-800">
                        <td className="px-3 py-2 font-mono text-neutral-300">{field.key}</td>
                        <td className="px-3 py-2 font-mono text-neutral-500">{field.defaultValue}</td>
                        <td className="px-3 py-2 font-mono text-blue-400">
                          {sampleSet ? formatValue(actualValue) : '—'}
                        </td>
                        <td className="px-3 py-2 text-neutral-400">{field.description}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* RALLY TABLE */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-neutral-300">
              📋 RALLY TABLE ({RALLY_PREPOPULATED_FIELDS.length} fields not touched)
            </h3>
            {sampleRally && (
              <div className="text-xs text-neutral-400 mb-2 italic">
                Showing actual values from Rally {sampleRally.rally_index}
              </div>
            )}
            <div className="overflow-x-auto border border-neutral-700 rounded">
              <table className="min-w-full text-xs">
                <thead className="bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Field</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Default Value</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Actual Value</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {RALLY_PREPOPULATED_FIELDS.map(field => {
                    const actualValue = sampleRally ? (sampleRally as any)[field.key] : undefined
                    return (
                      <tr key={field.key} className="border-t border-neutral-800">
                        <td className="px-3 py-2 font-mono text-neutral-300">{field.key}</td>
                        <td className="px-3 py-2 font-mono text-neutral-500">{field.defaultValue}</td>
                        <td className="px-3 py-2 font-mono text-blue-400">
                          {sampleRally ? formatValue(actualValue) : '—'}
                        </td>
                        <td className="px-3 py-2 text-neutral-400">{field.description}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* SHOT TABLE */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-neutral-300">
              📋 SHOT TABLE ({SHOT_PREPOPULATED_FIELDS.length} fields not touched)
            </h3>
            {sampleShot && (
              <div className="text-xs text-neutral-400 mb-2 italic">
                Showing actual values from Shot {sampleShot.shot_index}
              </div>
            )}
            <div className="overflow-x-auto border border-neutral-700 rounded">
              <table className="min-w-full text-xs">
                <thead className="bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Field</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Default Value</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Actual Value</th>
                    <th className="px-3 py-2 text-left font-mono text-neutral-300">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {SHOT_PREPOPULATED_FIELDS.map(field => {
                    const actualValue = sampleShot ? (sampleShot as any)[field.key] : undefined
                    return (
                      <tr key={field.key} className="border-t border-neutral-800">
                        <td className="px-3 py-2 font-mono text-neutral-300">{field.key}</td>
                        <td className="px-3 py-2 font-mono text-neutral-500">{field.defaultValue}</td>
                        <td className="px-3 py-2 font-mono text-blue-400">
                          {sampleShot ? formatValue(actualValue) : '—'}
                        </td>
                        <td className="px-3 py-2 text-neutral-400">{field.description}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Summary */}
          <div className="pt-4 border-t border-neutral-700 text-sm text-neutral-400">
            <p>
              <strong className="text-neutral-300">Total fields NOT modified by Phase 1:</strong> {totalFields}
            </p>
            <p className="mt-2">
              <strong className="text-neutral-300">Breakdown:</strong>
            </p>
            <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
              <li><strong className="text-yellow-400">Match:</strong> {MATCH_PREPOPULATED_FIELDS.length} fields (Phase 1 never modifies match table)</li>
              <li><strong className="text-neutral-300">Set:</strong> {SET_PREPOPULATED_FIELDS.length} fields</li>
              <li><strong className="text-neutral-300">Rally:</strong> {RALLY_PREPOPULATED_FIELDS.length} fields</li>
              <li><strong className="text-neutral-300">Shot:</strong> {SHOT_PREPOPULATED_FIELDS.length} fields</li>
            </ul>
            <p className="mt-3">
              These fields are either set during match creation, remain null until later phases (Phase 2 or Phase 3), 
              or are auto-generated by the database.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

