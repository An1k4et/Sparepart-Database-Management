import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ExcelViewer from './components/ExcelViewer';
import SearchBar from './components/SearchBar';
import LoginPage from './components/LoginPage';
import { FileRecord, ExcelData, SearchResult } from './types';
import { search, getFileData, getFiles } from './api';
import { FiDatabase, FiLogOut } from 'react-icons/fi';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('spdm_is_logged_in') === 'true';
  });

  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchingVesselIds, setSearchMatchingVesselIds] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleLogin = () => {
    localStorage.setItem('spdm_is_logged_in', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('spdm_is_logged_in');
    setIsLoggedIn(false);
    setSelectedFile(null);
    setExcelData(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const res = await search(query);
        setSearchResults(res);
        const parts = res.filter(r => r.result_type === 'part');
        setSearchMatchingVesselIds(parts.map(p => p.id));
      } catch (error) {
        console.error("Search failed:", error);
      }
    } else {
      setSearchMatchingVesselIds([]);
      setSearchResults([]);
    }
  };

  const handleSelectFile = async (file: FileRecord) => {
    setSelectedFile(file);
    setExcelData(null);
    try {
      const data = await getFileData(file.id);
      setExcelData(data);
    } catch (e) {
      console.error("Error loading excel data", e);
    }
  };

  const handleSelectVesselFromSearch = async (vesselId: string) => {
    try {
      // Find the file for this vessel to open it
      const files = await getFiles(vesselId);
      if (files.length > 0) {
        handleSelectFile(files[0]);
      } else {
        alert("No file uploaded for this location yet.");
      }
    } catch (error) {
      console.error("Failed to fetch file for vessel", error);
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100 font-sans text-slate-800">
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 flex-shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-2 text-white font-bold text-xl mr-8">
          <div className="bg-blue-600 p-1.5 rounded-md">
            <FiDatabase size={20} />
          </div>
          SPDM
        </div>
        <div className="flex-1 max-w-3xl">
          <SearchBar 
            onSearch={handleSearch} 
            results={searchResults}
            onSelectVessel={handleSelectVesselFromSearch}
            currentQuery={searchQuery}
          />
        </div>
        <button
          onClick={handleLogout}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-red-950/70 hover:border-red-700/60 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          title="Sign out of SPDM"
        >
          <FiLogOut size={14} />
          <span>Logout</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          searchMatchingVesselIds={searchMatchingVesselIds}
          selectedFileId={selectedFile?.id || null}
          onSelectFile={handleSelectFile}
          onFileDeleted={(fileId) => {
            if (selectedFile?.id === fileId) {
              setSelectedFile(null);
              setExcelData(null);
            }
            if (searchQuery.trim()) {
              handleSearch(searchQuery);
            }
          }}
        />
        
        {selectedFile ? (
          <ExcelViewer 
            file={selectedFile}
            data={excelData}
            onClose={() => { setSelectedFile(null); setSearchQuery(''); }}
            searchQuery={searchQuery}
            onClearSearch={() => handleSearch('')}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-xl font-medium text-gray-700">No file selected</h2>
            <p>Select an Excel file from the sidebar or search to view data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
