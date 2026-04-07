export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged'

export interface ColumnDiff {
  column_name: string
  status: DiffStatus
  left_type: string | null
  left_nullable: boolean | null
  left_comment: string | null
  right_type: string | null
  right_nullable: boolean | null
  right_comment: string | null
  changes: string[]
}

export interface TableComparisonResult {
  left_full_name: string
  right_full_name: string
  column_diffs: ColumnDiff[]
  partition_diff: {
    left_only: string[]
    right_only: string[]
    both: string[]
  }
  summary: {
    added: number
    removed: number
    modified: number
    unchanged: number
  }
}

// Schema-level comparison

export interface TableDiffSummary {
  table_name: string
  status: DiffStatus
  column_summary: { added: number; removed: number; modified: number; unchanged: number } | null
}

export interface SchemaComparisonResult {
  left_full_name: string
  right_full_name: string
  table_diffs: TableDiffSummary[]
  table_details: Record<string, TableComparisonResult>
  summary: { added: number; removed: number; modified: number; unchanged: number }
}
