// src/components/ImportExportPanel.tsx

import React, { useState, useRef } from 'react';
import { FileUtils, FileImportResult } from '../utils/fileUtils';
import { Upload, Download, File, X, Check, AlertCircle } from 'lucide-react';

interface ImportExportPanelProps {
  onImport?: (data: unknown, fileName: string) => void;
  onExport?: (format: string) => void;
  supportedFormats?: string[];
  maxSizeMB?: number;
}

interface QueuedFile {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  result?: FileImportResult;
  progress?: number;
}

export function ImportExportPanel({
  onImport,
  onExport,
  supportedFormats = ['glb', 'gltf', 'json', 'txt', 'obj'],
  maxSizeMB = 50,
}: ImportExportPanelProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [exportFormat, setExportFormat] = useState('json');
  const [exportFilename, setExportFilename] = useState('scene_export');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ═══ IMPORT ═══

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const newFiles: QueuedFile[] = Array.from(files).map(file => ({
      file,
      status: 'pending' as const,
    }));

    setQueuedFiles(prev => [...prev, ...newFiles]);
    processQueue(newFiles);
  };

  const processQueue = async (files: QueuedFile[]) => {
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const queued = files[i];
      
      setQueuedFiles(prev =>
        prev.map(f => (f.file === queued.file ? { ...f, status: 'processing', progress: 0 } : f))
      );

      // Validation
      const error = FileUtils.validateFile(queued.file, supportedFormats, maxSizeMB);
      if (error) {
        setQueuedFiles(prev =>
          prev.map(f =>
            f.file === queued.file
              ? { ...f, status: 'error', result: { success: false, error } }
              : f
          )
        );
        continue;
      }

      // Import
      const result = await FileUtils.importFile(queued.file);

      setQueuedFiles(prev =>
        prev.map(f =>
          f.file === queued.file
            ? { ...f, status: result.success ? 'success' : 'error', result, progress: 100 }
            : f
        )
      );

      if (result.success && onImport) {
        onImport(result.data!, result.fileName!);
      }
    }

    setIsProcessing(false);
  };

  const removeFile = (file: File) => {
    setQueuedFiles(prev => prev.filter(f => f.file !== file));
  };

  const clearAll = () => {
    setQueuedFiles([]);
  };

  // ═══ EXPORT ═══

  const handleExport = async () => {
    if (!onExport) return;

    setIsProcessing(true);
    onExport(exportFormat);
    
    // Simulation de progression
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 100));
    }

    setIsProcessing(false);
  };

  // ═══ RENDER ═══

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'import' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('import')}
        >
          <Upload size={18} /> Importer
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'export' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('export')}
        >
          <Download size={18} /> Exporter
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'import' ? (
          <div style={styles.importSection}>
            {/* Drop Zone */}
            <div
              style={styles.dropZone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelect(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} color="#00d4ff" />
              <p style={styles.dropZoneText}>Glissez-déposez vos fichiers ici</p>
              <p style={styles.dropZoneSub}>ou cliquez pour parcourir</p>
              <p style={styles.supportedFormats}>
                Formats: {supportedFormats.map(f => `.${f}`).join(', ')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={supportedFormats.map(f => `.${f}`).join(',')}
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {/* File Queue */}
            {queuedFiles.length > 0 && (
              <div style={styles.fileQueue}>
                <div style={styles.queueHeader}>
                  <span style={styles.queueTitle}>Fichiers ({queuedFiles.length})</span>
                  <button style={styles.clearButton} onClick={clearAll}>
                    <X size={16} /> Tout effacer
                  </button>
                </div>

                {queuedFiles.map((item) => (
                  <div key={item.file.name} style={styles.fileItem}>
                    <div style={styles.fileIcon}>
                      {FileUtils.getFileIcon(item.file.name.split('.').pop() || '')}
                    </div>
                    <div style={styles.fileInfo}>
                      <span style={styles.fileName}>{item.file.name}</span>
                      <span style={styles.fileSize}>{FileUtils.formatFileSize(item.file.size)}</span>
                    </div>
                    <div style={styles.fileStatus}>
                      {item.status === 'pending' && <span style={styles.statusPending}>⏳ En attente</span>}
                      {item.status === 'processing' && (
                        <span style={styles.statusProcessing}>
                          🔄 {item.progress}%
                        </span>
                      )}
                      {item.status === 'success' && (
                        <span style={styles.statusSuccess}>
                          <Check size={16} color="#34d399" /> Importé
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span style={styles.statusError}>
                          <AlertCircle size={16} color="#f87171" /> {item.result?.error}
                        </span>
                      )}
                    </div>
                    <button style={styles.removeButton} onClick={() => removeFile(item.file)}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.exportSection}>
            {/* Format Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Format d'export</label>
              <select
                style={styles.select}
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="json">JSON (Scène, Props, Configuration)</option>
                <option value="glb">GLB (Modèle 3D binaire)</option>
                <option value="gltf">GLTF (Modèle 3D JSON)</option>
                <option value="obj">OBJ (Modèle 3D texte)</option>
                <option value="txt">TXT (Rapport, Logs)</option>
              </select>
            </div>

            {/* Filename */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom du fichier</label>
              <input
                style={styles.input}
                type="text"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder="nom_du_fichier"
              />
            </div>

            {/* Preview */}
            <div style={styles.exportPreview}>
              <p style={styles.previewLabel}>Aperçu:</p>
              <code style={styles.previewFilename}>
                {exportFilename}.{exportFormat}
              </code>
            </div>

            {/* Export Button */}
            <button
              style={{ ...styles.exportButton, ...(isProcessing ? styles.buttonDisabled : {}) }}
              onClick={handleExport}
              disabled={isProcessing}
            >
              {isProcessing ? '⏳ Export en cours...' : '📦 Exporter le fichier'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    background: 'rgba(15,23,42,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    padding: '14px 20px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'rgba(0,212,255,0.1)',
    color: '#00d4ff',
    borderBottom: '2px solid #00d4ff',
  },
  content: {
    padding: '20px',
  },
  importSection: {
    display: 'grid',
    gap: '16px',
  },
  dropZone: {
    border: '2px dashed rgba(0,212,255,0.35)',
    borderRadius: '16px',
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'rgba(0,212,255,0.05)',
    transition: 'all 0.2s',
  },
  dropZoneText: {
    margin: '16px 0 8px',
    color: '#f8fafc',
    fontSize: '16px',
    fontWeight: 600,
  },
  dropZoneSub: {
    margin: 0,
    color: '#94a3b8',
    fontSize: '14px',
  },
  supportedFormats: {
    margin: '12px 0 0',
    color: '#64748b',
    fontSize: '12px',
  },
  fileQueue: {
    background: 'rgba(2,6,23,0.8)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  queueTitle: {
    color: '#f8fafc',
    fontSize: '14px',
    fontWeight: 700,
  },
  clearButton: {
    background: 'transparent',
    border: '1px solid rgba(248,113,113,0.35)',
    color: '#f87171',
    borderRadius: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
  },
  fileItem: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr auto auto',
    gap: '12px',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(15,23,42,0.8)',
    borderRadius: '10px',
    marginBottom: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  fileIcon: {
    fontSize: '24px',
    display: 'grid',
    placeItems: 'center',
  },
  fileInfo: {
    display: 'grid',
    gap: '2px',
  },
  fileName: {
    color: '#f8fafc',
    fontSize: '14px',
    fontWeight: 600,
  },
  fileSize: {
    color: '#64748b',
    fontSize: '12px',
  },
  fileStatus: {
    fontSize: '12px',
  },
  statusPending: { color: '#fbbf24' },
  statusProcessing: { color: '#00d4ff' },
  statusSuccess: { color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' },
  statusError: { color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' },
  removeButton: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
  },
  exportSection: {
    display: 'grid',
    gap: '16px',
  },
  formGroup: {
    display: 'grid',
    gap: '8px',
  },
  label: {
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: {
    background: 'rgba(2,6,23,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#f8fafc',
    fontSize: '14px',
    cursor: 'pointer',
  },
  input: {
    background: 'rgba(2,6,23,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#f8fafc',
    fontSize: '14px',
  },
  exportPreview: {
    background: 'rgba(2,6,23,0.6)',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  previewLabel: {
    margin: '0 0 8px',
    color: '#64748b',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  previewFilename: {
    color: '#00d4ff',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  exportButton: {
    background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 24px',
    color: '#000',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default ImportExportPanel;