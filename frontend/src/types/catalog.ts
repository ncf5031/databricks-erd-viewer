export interface CatalogInfo {
  name: string
  comment: string | null
  owner: string | null
}

export interface SchemaInfo {
  name: string
  catalog_name: string
  comment: string | null
  owner: string | null
  table_count: number
}
