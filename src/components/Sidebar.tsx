import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronDown, FiChevronRight, FiTrash2, FiFolder, FiFileText, FiUpload } from 'react-icons/fi';
import { Client, Vessel, FileRecord } from '../types';
import { getClients, getVessels, createClient, createVessel, deleteClient, deleteVessel, getFiles, deleteFile, uploadFile } from '../api';
import Modal from './Modal';

interface SidebarProps {
  searchMatchingVesselIds: string[];
  selectedFileId: string | null;
  onSelectFile: (file: FileRecord) => void;
  onFileDeleted?: (fileId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ searchMatchingVesselIds, selectedFileId, onSelectFile, onFileDeleted }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [clientVessels, setClientVessels] = useState<Record<string, Vessel[]>>({});
  const [vesselFiles, setVesselFiles] = useState<Record<string, FileRecord[]>>({});
  
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  
  const [isAddVesselModalOpen, setIsAddVesselModalOpen] = useState(false);
  const [activeClientIdForVessel, setActiveClientIdForVessel] = useState<string | null>(null);
  const [newVesselName, setNewVesselName] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadVesselId, setUploadVesselId] = useState<string | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const loadVesselFiles = async (vesselId: string) => {
    try {
      const files = await getFiles(vesselId);
      setVesselFiles(prev => ({ ...prev, [vesselId]: files }));
    } catch (e) {
      console.error("Failed to load files", e);
    }
  };

  const loadVessels = async (clientId: string) => {
    try {
      const vessels = await getVessels(clientId);
      setClientVessels(prev => ({ ...prev, [clientId]: vessels }));
      for (const v of vessels) {
        await loadVesselFiles(v.id);
      }
    } catch (error) {
      console.error("Failed to load vessels", error);
    }
  };

  const toggleClient = async (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      if (!clientVessels[clientId]) {
        await loadVessels(clientId);
      }
    }
    setExpandedClients(newExpanded);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      await createClient(newClientName.trim());
      setNewClientName('');
      setIsAddClientModalOpen(false);
      fetchClients();
    } catch (error) {
      console.error("Failed to create client", error);
    }
  };

  const handleAddVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVesselName.trim() || !activeClientIdForVessel) return;
    try {
      await createVessel(activeClientIdForVessel, newVesselName.trim());
      setNewVesselName('');
      setIsAddVesselModalOpen(false);
      loadVessels(activeClientIdForVessel);
      if (!expandedClients.has(activeClientIdForVessel)) {
        setExpandedClients(prev => new Set(prev).add(activeClientIdForVessel!));
      }
    } catch (error) {
      console.error("Failed to create vessel", error);
    }
  };

  const handleDeleteClient = async (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this client and all its vessels?')) {
      try {
        await deleteClient(clientId);
        fetchClients();
      } catch (error) {
        console.error("Failed to delete client", error);
      }
    }
  };

  const handleDeleteVessel = async (e: React.MouseEvent, clientId: string, vesselId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this vessel and all its files?')) {
      try {
        await deleteVessel(vesselId);
        loadVessels(clientId);
      } catch (error) {
        console.error("Failed to delete vessel", error);
      }
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadVesselId || !selectedUploadFile) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setUploadProgress('Preparing upload...');

    try {
      await uploadFile(uploadVesselId, selectedUploadFile, (status) => {
        setUploadProgress(status);
      });
      setIsUploadModalOpen(false);
      setSelectedUploadFile(null);
      setUploadProgress(null);
      await loadVesselFiles(uploadVesselId);
    } catch (error: any) {
      console.error("Failed to upload and index file", error);
      setErrorMessage(error.message || "Failed to upload spreadsheet to Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFile = async (e: React.MouseEvent, vesselId: string, fileId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteFile(fileId);
        await loadVesselFiles(vesselId);
        if (onFileDeleted) {
          onFileDeleted(fileId);
        }
      } catch (error) {
        console.error("Failed to delete file", error);
      }
    }
  };

  return (
    <div className="w-80 bg-slate-900 text-white h-full flex flex-col border-r border-slate-800 flex-shrink-0">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FiFolder /> Clients
        </h2>
        <button 
          onClick={() => setIsAddClientModalOpen(true)}
          className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Add Client"
        >
          <FiPlus size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {clients.map(client => (
          <div key={client.id} className="mb-1">
            <div 
              className="flex items-center justify-between px-4 py-2 cursor-pointer group hover:bg-slate-800 transition-colors"
              onClick={() => toggleClient(client.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-slate-400">
                  {expandedClients.has(client.id) ? <FiChevronDown /> : <FiChevronRight />}
                </span>
                <span className="truncate">{client.name}</span>
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveClientIdForVessel(client.id); setIsAddVesselModalOpen(true); }}
                  className="p-1 text-slate-400 hover:text-blue-400 cursor-pointer"
                  title="Add Vessel"
                >
                  <FiPlus size={16} />
                </button>
                <button 
                  onClick={(e) => handleDeleteClient(e, client.id)}
                  className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                  title="Delete Client"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
            
            {expandedClients.has(client.id) && clientVessels[client.id] && (
              <div className="ml-6 border-l border-slate-700 pl-2 mt-1 space-y-2 pb-2">
                {clientVessels[client.id].length === 0 ? (
                  <div className="text-slate-500 text-sm px-2 py-1">No vessels found</div>
                ) : (
                  clientVessels[client.id].map(vessel => {
                    const isSearchMatch = searchMatchingVesselIds.includes(vessel.id);
                    const files = vesselFiles[vessel.id] || [];
                    const hasFile = files.length > 0;
                    const file = hasFile ? files[0] : null;

                    return (
                      <div key={vessel.id} className="mb-2">
                        <div className={`flex items-center justify-between px-2 py-1.5 rounded group hover:bg-slate-800 transition-colors ${isSearchMatch ? 'bg-yellow-900/30 border border-yellow-700/50' : ''}`}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="truncate text-slate-300 font-medium">{vessel.name}</span>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteVessel(e, client.id, vessel.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity cursor-pointer"
                            title="Delete Vessel"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                        
                        <div className="pl-4 mt-1">
                          {hasFile && file ? (
                            <div 
                              className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group hover:bg-slate-700 transition-colors ${selectedFileId === file.id ? 'bg-slate-700 text-blue-400' : 'text-slate-400'}`}
                              onClick={() => onSelectFile(file)}
                            >
                              <div className="flex items-center gap-2 overflow-hidden text-sm">
                                <FiFileText size={14} className={selectedFileId === file.id ? 'text-blue-400' : 'text-green-500'} />
                                <span className="truncate" title={file.filename}>{file.filename}</span>
                              </div>
                              <button 
                                onClick={(e) => handleDeleteFile(e, vessel.id, file.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity cursor-pointer"
                                title="Delete File"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { 
                                setUploadVesselId(vessel.id); 
                                setIsUploadModalOpen(true); 
                                setErrorMessage(null);
                                setUploadProgress(null);
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            >
                              <FiUpload size={12} />
                              <span>Upload Excel</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))}
        {clients.length === 0 && (
          <div className="p-4 text-center text-slate-500 text-sm">
            No clients added yet. Click + to add one.
          </div>
        )}
      </div>

      <Modal isOpen={isAddClientModalOpen} onClose={() => setIsAddClientModalOpen(false)} title="Add New Client">
        <form onSubmit={handleAddClient}>
          <input 
            type="text" 
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-black"
            placeholder="Client Name"
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAddClientModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={!newClientName.trim()}>Add Client</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddVesselModalOpen} onClose={() => setIsAddVesselModalOpen(false)} title="Add New Vessel">
        <form onSubmit={handleAddVessel}>
          <input 
            type="text" 
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-black"
            placeholder="Vessel Name"
            value={newVesselName}
            onChange={e => setNewVesselName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAddVesselModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={!newVesselName.trim()}>Add Vessel</button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => { 
          if (!isSubmitting) {
            setIsUploadModalOpen(false); 
            setSelectedUploadFile(null); 
            setErrorMessage(null);
            setUploadProgress(null);
          }
        }} 
        title="Upload & Index Excel File"
      >
        <form onSubmit={handleUploadFile} className="space-y-4">
          <p className="text-xs text-gray-500">
            Select an Excel file (.xlsx, .xls) from your computer. It will be uploaded and indexed for instant remote search across all devices.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Select Excel Spreadsheet
            </label>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv"
              disabled={isSubmitting}
              className="w-full border border-gray-300 rounded p-2 text-sm text-black"
              onChange={e => setSelectedUploadFile(e.target.files?.[0] || null)}
            />
          </div>

          {uploadProgress && (
            <div className="p-3 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded flex items-center gap-2">
              <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span>{uploadProgress}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-600 rounded">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => { 
                setIsUploadModalOpen(false); 
                setSelectedUploadFile(null); 
                setErrorMessage(null);
                setUploadProgress(null);
              }} 
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !selectedUploadFile}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? 'Uploading...' : 'Upload & Index'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Sidebar;
