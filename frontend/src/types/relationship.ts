export type RelationshipType = 'explicit' | 'inferred'

export interface Relationship {
  source_table: string
  source_column: string
  target_table: string
  target_column: string
  type: RelationshipType
  constraint_name: string | null
  confidence: string | null
}
