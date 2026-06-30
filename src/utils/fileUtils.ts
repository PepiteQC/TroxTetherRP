// src/utils/fileUtils.ts

export interface FileExportOptions {
  format: 'glb' | 'gltf' | 'json' | 'txt' | 'obj';
  filename: string;
  data: unknown;
}

export interface FileImportResult {
  success: boolean;
  data?: unknown;
  error?: string;
  fileName?: string;
  fileSize?: number;
}

export class FileUtils {
  // ═══ EXPORT ═══

  static async exportToFile(options: FileExportOptions): Promise<Blob> {
    const { format, filename, data } = options;

    let blob: Blob;
    let mimeType: string;

    switch (format) {
      case 'glb':
      case 'gltf':
        mimeType = format === 'glb' ? 'model/gltf-binary' : 'model/gltf+json';
        blob = new Blob([data as ArrayBuffer], { type: mimeType });
        break;

      case 'json':
        mimeType = 'application/json';
        blob = new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
        break;

      case 'txt':
        mimeType = 'text/plain';
        blob = new Blob([data as string], { type: mimeType });
        break;

      case 'obj':
        mimeType = 'model/obj';
        blob = new Blob([data as string], { type: mimeType });
        break;

      default:
        throw new Error(`Format non supporté: ${format}`);
    }

    return blob;
  }

  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async exportScene(
    sceneData: unknown,
    format: 'json' | 'glb' = 'json',
    filename?: string
  ): Promise<void> {
    const blob = await this.exportToFile({
      format: format === 'glb' ? 'glb' : 'json',
      filename: filename || `scene_${Date.now()}.${format}`,
      data: sceneData,
    });

    this.downloadFile(blob, filename || `scene_${Date.now()}.${format}`);
  }

  // ═══ IMPORT ═══

  static async importFile(file: File): Promise<FileImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result;
          const extension = file.name.split('.').pop()?.toLowerCase();

          let data: unknown;

          switch (extension) {
            case 'json':
              data = JSON.parse(content as string);
              break;

            case 'glb':
            case 'gltf':
              data = content; // ArrayBuffer pour Three.js
              break;

            case 'txt':
              data = content as string;
              break;

            case 'obj':
              data = content as string;
              break;

            default:
              resolve({
                success: false,
                error: `Format non supporté: .${extension}`,
              });
              return;
          }

          resolve({
            success: true,
            data,
            fileName: file.name,
            fileSize: file.size,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Échec de la lecture du fichier',
        });
      };

      // GLB/GLTF besoin d'ArrayBuffer, autres en texte
      if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  static async importFiles(files: FileList | File[]): Promise<FileImportResult[]> {
    const results: FileImportResult[] = [];

    for (const file of Array.from(files)) {
      const result = await this.importFile(file);
      results.push(result);
    }

    return results;
  }

  // ═══ UTILS ═══

  static getFileIcon(extension: string): string {
    const icons: Record<string, string> = {
      glb: '📦',
      gltf: '📦',
      json: '📄',
      txt: '📝',
      obj: '🔷',
      png: '🖼️',
      jpg: '🖼️',
      mp3: '🎵',
      wav: '🎵',
    };
    return icons[extension.toLowerCase()] || '📁';
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static validateFile(file: File, allowedExtensions: string[], maxSizeMB?: number): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension && !allowedExtensions.includes(extension)) {
      return `Format non autorisé: .${extension}`;
    }

    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      return `Fichier trop volumineux: ${this.formatFileSize(file.size)} (max: ${maxSizeMB}MB)`;
    }

    return null;
  }
}

export default FileUtils;