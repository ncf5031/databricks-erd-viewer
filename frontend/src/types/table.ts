export interface ColumnDetail {
  name: string
  type_name: string
  nullable: boolean
  comment: string | null
  is_primary_key: boolean
  is_foreign_key: boolean
}

export interface TableSummary {
  name: string
  full_name: string
  table_type: string
  comment: string | null
  owner: string | null
}

export interface TableDetail extends TableSummary {
  columns: ColumnDetail[]
  partition_columns: string[]
  created_at: string | null
  updated_at: string | null
  properties: Record<string, string>
}
