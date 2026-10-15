import React, { useMemo, useState, useEffect } from 'react';
import { FiX, FiFileText, FiExternalLink, FiDownload, FiCheck, FiCopy } from 'react-icons/fi';
import { FileRecord, ExcelData } from '../types';
import { getFileDownloadUrl } from '../api';

interface ExcelViewerProps {
  file: FileRecord;
  data: ExcelData | null;
  onClose: () => void;
  searchQuery: string;
  onClearSearch?: () => void;
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({ file, data, onClose, searchQuery, onClearSearch }) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);
  const [headerCopied, setHeaderCopied] = useState(false);

  // Load public file URL from Supabase when file changes
  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      try {
        const url = await getFileDownloadUrl(file.id);
        if (isMounted) {
          setDownloadUrl(url || file.public_url || null);
        }
      } catch (err) {
        console.error("Failed to load file public URL", err);
      }
    };
    fetchUrl();
    return () => { isMounted = false; };
  }, [file.id, file.public_url]);

  const publicUrl = downloadUrl || file.public_url || '';
  // Microsoft Office for the Web free document preview URL
  const webPreviewUrl = publicUrl 
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicUrl)}` 
    : '';

  const rowsWithIndices = useMemo(() => {
    if (!data || !searchQuery.trim()) {
      return (data?.rows || []).map((row, idx) => ({ row, originalIndex: idx }));
    }

    // Extract alphanumeric terms from query
    const words = searchQuery.match(/[a-zA-Z0-9]+/g);
    if (!words || words.length === 0) {
      return data.rows.map((row, idx) => ({ row, originalIndex: idx }));
    }

    // Build cohesive phrase regex (e.g. Lub[e]?[\s._-]+Oil[\s._-]+Pipe)
    // Ensures words appear together in sequence, preventing false matches where words are scattered
    const patternParts = words.map(w => {
      if (w.toLowerCase() === 'lub') return 'lube?';
      return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });

    const phraseRegex = new RegExp(patternParts.join('[\\s._-]+'), 'i');

    return data.rows
      .map((row, idx) => ({ row, originalIndex: idx }))
      .filter(({ row }) => {
        const rowStr = row.join(' ');
        return phraseRegex.test(rowStr);
      });
  }, [data, searchQuery]);

  if (!data) {
    return (
      <div className="flex-1 min-w-0 bg-white flex flex-col h-full shadow-lg">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-medium truncate flex-1">{file.filename}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
            <FiX size={20} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span>Loading spreadsheet rows from Supabase...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 bg-white flex flex-col h-full shadow-lg animate-in slide-in-from-right-8 duration-300">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
          <FiFileText className="text-green-600 flex-shrink-0" />
          <h2 className="font-medium text-gray-800 truncate" title={file.filename}>{file.filename}</h2>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
            {data.rows.length.toLocaleString()} rows
          </span>
          {searchQuery.trim() && (
            <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs flex-shrink-0">
              <span className="truncate">Filtered by: "{searchQuery}" ({rowsWithIndices.length} matches)</span>
              {onClearSearch && (
                <button
                  onClick={onClearSearch}
                  className="hover:bg-blue-200 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center font-bold text-xs cursor-pointer ml-1"
                  title="Clear filter to show all rows"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Open in Web Browser Excel Preview */}
          {webPreviewUrl && (
            <a
              href={webPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors cursor-pointer"
              title="Open Excel workbook in web browser preview"
            >
              <FiExternalLink size={13} />
              <span>Preview in Browser</span>
            </a>
          )}

          {/* Download Original File */}
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={file.filename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors cursor-pointer"
              title="Download original Excel spreadsheet"
            >
              <FiDownload size={13} />
              <span>Download Excel</span>
            </a>
          )}

          {/* Copy Public Link */}
          {publicUrl && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                setHeaderCopied(true);
                setTimeout(() => setHeaderCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors cursor-pointer"
              title="Copy Supabase storage link"
            >
              {headerCopied ? <FiCheck size={12} className="text-green-600" /> : <FiCopy size={12} />}
              <span>{headerCopied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          )}

          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors ml-1 cursor-pointer">
            <FiX size={20} />
          </button>
        </div>
      </div>
      
      {/* Table Data View */}
      <div className="flex-1 min-h-0 bg-white p-4 flex flex-col">
        <div className="flex-1 min-h-0 rounded-lg border border-gray-200 overflow-auto relative">
          <table className="min-w-max w-full text-sm text-left whitespace-nowrap border-collapse">
            <thead className="text-xs text-gray-700 bg-gray-100 uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 font-semibold text-center w-12 bg-gray-100 border-r border-gray-200">#</th>
                <th className="px-4 py-3 font-semibold text-center w-44 bg-gray-100 border-r border-gray-200">Action Link</th>
                {data.headers.map((header, idx) => (
                  <th key={idx} className={`px-4 py-3 font-semibold border-r border-gray-200 ${idx === 0 ? 'bg-gray-100 font-bold' : ''}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsWithIndices.map(({ row, originalIndex }, displayIdx) => (
                <tr 
                  key={originalIndex} 
                  className={`border-b border-gray-200 last:border-0 hover:bg-blue-50/70 transition-colors ${displayIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                >
                  <td 
                    className="px-3 py-2 text-center text-xs text-gray-500 border-r border-gray-200 font-mono"
                    title={`Original Excel Row #${originalIndex + 1}`}
                  >
                    {displayIdx + 1}
                  </td>

                  {/* Automatic Supabase Link Column */}
                  <td className="px-3 py-2 text-center border-r border-gray-200">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      {webPreviewUrl ? (
                        <a
                          href={webPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                          title="Open spreadsheet in Web Browser Preview"
                        >
                          <FiExternalLink size={12} />
                          <span>Web Preview</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}

                      {/* Quick copy row values */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(row.join('\t'));
                          setCopiedRowIndex(originalIndex);
                          setTimeout(() => setCopiedRowIndex(null), 1500);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Copy row values to clipboard"
                      >
                        {copiedRowIndex === originalIndex ? (
                          <FiCheck size={12} className="text-green-600" />
                        ) : (
                          <FiCopy size={11} />
                        )}
                      </button>
                    </div>
                  </td>

                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className={`px-4 py-2 border-r border-gray-200 ${cellIndex === 0 ? 'font-medium text-gray-900 bg-gray-50/40' : 'text-gray-700'}`}
                    >
                      {cell || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rowsWithIndices.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No matching data found for "{searchQuery}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelViewer;
