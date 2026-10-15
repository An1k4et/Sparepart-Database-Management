import { supabase } from '../supabaseClient';
import { Client, Vessel, FileRecord, ExcelData, SearchResult } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import * as XLSX from 'xlsx';

export const getClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const createClient = async (name: string): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .insert([{ name }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteClient = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const getVessels = async (clientId: string): Promise<Vessel[]> => {
  const { data, error } = await supabase
    .from('vessels')
    .select('*')
    .eq('client_id', clientId)
    .order('name');
  if (error) throw error;
  return data || [];
};

export const createVessel = async (clientId: string, name: string): Promise<Vessel> => {
  const { data, error } = await supabase
    .from('vessels')
    .insert([{ client_id: clientId, name }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteVessel = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('vessels')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const getFiles = async (vesselId: string): Promise<FileRecord[]> => {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('vessel_id', vesselId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(f => {
    let pubUrl = f.public_url;
    if (!pubUrl && f.storage_path) {
      pubUrl = supabase.storage.from('excel-files').getPublicUrl(f.storage_path).data.publicUrl;
    }
    return {
      id: f.id,
      vessel_id: f.vessel_id,
      filename: f.filename,
      filepath: f.storage_path || '',
      public_url: pubUrl,
      created_at: f.created_at
    };
  });
};

export const uploadFile = async (
  vesselId: string, 
  file: File, 
  onProgress?: (msg: string) => void
): Promise<FileRecord> => {
  // 1. Clean up any existing file for this vessel first (a vessel can only have ONE file)
  const { data: existingFiles } = await supabase
    .from('files')
    .select('id, storage_path')
    .eq('vessel_id', vesselId);

  if (existingFiles && existingFiles.length > 0) {
    for (const ef of existingFiles) {
      await deleteFile(ef.id);
    }
  }

  // 2. Parse spreadsheet in browser
  if (onProgress) onProgress('Parsing spreadsheet rows...');
  const { headers, rows } = await parseExcelFile(file);

  // 3. Upload file to Supabase Storage
  if (onProgress) onProgress('Uploading file to cloud storage...');
  const storagePath = `${vesselId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error: storageError } = await supabase.storage
    .from('excel-files')
    .upload(storagePath, file, { upsert: true });

  if (storageError) {
    console.error("Storage upload error:", storageError);
    throw new Error(storageError.message || "Failed to upload file to Supabase storage");
  }

  // 4. Generate public link for web browser preview
  const { data: pubData } = supabase.storage
    .from('excel-files')
    .getPublicUrl(storagePath);
  const publicUrl = pubData?.publicUrl || '';

  // 5. Register file record in files table
  if (onProgress) onProgress('Registering file record...');
  const { data: fileRecord, error: fileInsertError } = await supabase
    .from('files')
    .insert([{
      vessel_id: vesselId,
      filename: file.name,
      storage_path: storagePath,
      total_rows: rows.length,
      headers: headers,
      public_url: publicUrl
    }])
    .select()
    .single();

  if (fileInsertError) throw fileInsertError;

  // 6. Index all rows into spare_parts with search_text = row.join(' ')
  // This guarantees search matches 100% identically with ExcelViewer!
  const CHUNK_SIZE = 1000;
  const totalRows = rows.length;

  for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    if (onProgress) {
      const current = Math.min(i + CHUNK_SIZE, totalRows);
      onProgress(`Indexing rows ${current} / ${totalRows}...`);
    }

    const payload = chunk.map((r, chunkIdx) => ({
      vessel_id: vesselId,
      file_id: fileRecord.id,
      row_index: i + chunkIdx,
      part_name: r[0] || 'Part',
      search_text: r.join(' ')
    }));

    const { error: batchErr } = await supabase
      .from('spare_parts')
      .insert(payload);

    if (batchErr) {
      console.error("Batch insert error:", batchErr);
      throw batchErr;
    }
  }

  return {
    id: fileRecord.id,
    vessel_id: fileRecord.vessel_id,
    filename: fileRecord.filename,
    filepath: fileRecord.storage_path,
    public_url: publicUrl,
    created_at: fileRecord.created_at
  };
};

export const getFileData = async (fileId: string): Promise<ExcelData> => {
  // 1. Fetch file record from files table
  const { data: fileRec, error: fErr } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (fErr || !fileRec) throw fErr || new Error("File record not found");

  let publicUrl = fileRec.public_url;
  if (!publicUrl && fileRec.storage_path) {
    publicUrl = supabase.storage.from('excel-files').getPublicUrl(fileRec.storage_path).data.publicUrl;
  }

  // 2. Fetch original Excel file directly via public CDN URL (fast and requires no SELECT policy)
  if (publicUrl || fileRec.storage_path) {
    try {
      let arrayBuffer: ArrayBuffer | null = null;
      if (publicUrl) {
        const resp = await fetch(publicUrl);
        if (resp.ok) {
          arrayBuffer = await resp.arrayBuffer();
        }
      }

      if (!arrayBuffer && fileRec.storage_path) {
        const { data: blob } = await supabase.storage
          .from('excel-files')
          .download(fileRec.storage_path);
        if (blob) {
          arrayBuffer = await blob.arrayBuffer();
        }
      }

      if (arrayBuffer) {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rawData && rawData.length > 0) {
          const headers = (rawData[0] || []).map((h: any) => String(h ?? '').trim());
          const rows: string[][] = [];
          for (let i = 1; i < rawData.length; i++) {
            const r = rawData[i] || [];
            const strRow = r.map((c: any) => (c !== null && c !== undefined ? String(c).trim() : ''));
            if (strRow.some(c => c.length > 0)) {
              rows.push(strRow);
            }
          }
          return { headers, rows, public_url: publicUrl };
        }
      }
    } catch (parseErr) {
      console.warn("Storage parse error, falling back to database table:", parseErr);
    }
  }

  // Fallback: fetch from spare_parts table
  const { data: partRows, error: pErr } = await supabase
    .from('spare_parts')
    .select('search_text, row_index')
    .eq('file_id', fileId)
    .order('row_index', { ascending: true });

  if (pErr) throw pErr;

  const headers: string[] = Array.isArray(fileRec?.headers) ? fileRec.headers : [];
  const rows: string[][] = (partRows || []).map(r => (r.search_text || '').split(' '));

  return { headers, rows, public_url: publicUrl };
};

export const deleteFile = async (id: string): Promise<void> => {
  // 1. Fetch storage_path to remove from bucket
  const { data: fileRec } = await supabase
    .from('files')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fileRec?.storage_path) {
    await supabase.storage.from('excel-files').remove([fileRec.storage_path]);
  }

  // 2. Delete database record (cascades to spare_parts)
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const search = async (query: string): Promise<SearchResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Call the high-speed RPC stored procedure
  const { data, error } = await supabase.rpc('search_vessel_parts', {
    search_query: trimmed
  });

  if (error) {
    console.error("RPC search error:", error);
    return fallbackSearch(trimmed);
  }

  // Return one clean SearchResult per vessel with the exact match count
  return (data || []).map((item: any) => {
    const loc = `${item.client_name} / ${item.vessel_name}`;
    return {
      result_type: 'part',
      id: item.vessel_id,
      name: trimmed,
      context: loc,
      file_id: loc,
      match_count: Number(item.match_count) || 0
    };
  });
};

const fallbackSearch = async (query: string): Promise<SearchResult[]> => {
  const words = query.match(/[a-zA-Z0-9]+/g);
  if (!words || words.length === 0) return [];

  const patternParts = words.map(w => {
    if (w.toLowerCase() === 'lub') return 'lube?';
    return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const phraseRegex = new RegExp(patternParts.join('[\\s._-]+'), 'i');

  // Query database using the first word as a pre-filter
  const { data, error } = await supabase
    .from('spare_parts')
    .select('vessel_id, file_id, search_text, vessels!inner(name, clients!inner(name))')
    .ilike('search_text', `%${words[0]}%`)
    .limit(5000);

  if (error) {
    console.error("Fallback search failed:", error);
    return [];
  }

  const counts: Record<string, { vesselId: string; loc: string; count: number }> = {};
  (data || []).forEach((p: any) => {
    if (!phraseRegex.test(p.search_text || '')) return;
    const clientName = p.vessels?.clients?.name || 'Client';
    const vesselName = p.vessels?.name || 'Vessel';
    const loc = `${clientName} / ${vesselName}`;
    if (!counts[loc]) {
      counts[loc] = { vesselId: p.vessel_id, loc, count: 0 };
    }
    counts[loc].count += 1;
  });

  return Object.values(counts).map(item => ({
    result_type: 'part',
    id: item.vesselId,
    name: query,
    context: item.loc,
    file_id: item.loc,
    match_count: item.count
  }));
};

export const getFileDownloadUrl = async (fileId: string): Promise<string | null> => {
  const { data: fileRec } = await supabase
    .from('files')
    .select('storage_path, public_url')
    .eq('id', fileId)
    .single();

  if (fileRec?.public_url) return fileRec.public_url;
  if (!fileRec?.storage_path) return null;

  const { data } = supabase.storage
    .from('excel-files')
    .getPublicUrl(fileRec.storage_path);

  return data?.publicUrl || null;
};
