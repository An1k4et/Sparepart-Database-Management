export interface Client {
  id: string;
  name: string;
  created_at: string;
}

export interface Vessel {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  vessel_id: string;
  filename: string;
  filepath: string;
  public_url?: string;
  created_at: string;
}

export interface ExcelData {
  headers: string[];
  rows: string[][];
  public_url?: string;
}

export interface SearchResult {
  result_type: 'client' | 'vessel' | 'part';
  id: string;
  name: string;
  context: string;
  file_id: string | null;
  match_count?: number;
}

export interface RowLink {
  id: string;
  file_id: string;
  row_index: number;
  url: string;
  label?: string;
  created_at: string;
}
