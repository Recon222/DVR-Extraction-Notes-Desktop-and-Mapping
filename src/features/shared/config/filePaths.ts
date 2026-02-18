/**
 * Central file path configuration
 * CRITICAL: Never hardcode these paths anywhere else in the application
 */

export const FILE_NAMES = {
  XLSX: 'CCTV_Chronology.xlsx',
  CONFIG: 'case_config.json',
  GEOJSON: 'CCTV_Chronology.geojson',
  MEDIA_DIR: 'CCTV Chronology Media and Docs',
  IMAGES_DIR: 'CCTV Chronology Images',
  VIDEO_DIR: 'CCTV Chronology Video',
} as const;

/**
 * File separator for multiple files
 * CRITICAL: ALWAYS use "; " (semicolon + space) for consistency
 */
export const FILE_SEPARATOR = '; ';

/**
 * Path separator - Windows uses backslash
 * Export this for use in path building throughout the app
 */
export const PATH_SEP = '\\';

/**
 * Generate full media directory path
 */
export const getMediaPath = (caseDir: string): string => {
  return `${caseDir}${PATH_SEP}${FILE_NAMES.MEDIA_DIR}`;
};

/**
 * Generate images directory path
 */
export const getImagesPath = (caseDir: string): string => {
  return `${caseDir}${PATH_SEP}${FILE_NAMES.MEDIA_DIR}${PATH_SEP}${FILE_NAMES.IMAGES_DIR}`;
};

/**
 * Generate video directory path
 */
export const getVideoPath = (caseDir: string): string => {
  return `${caseDir}${PATH_SEP}${FILE_NAMES.MEDIA_DIR}${PATH_SEP}${FILE_NAMES.VIDEO_DIR}`;
};

/**
 * Generate XLSX file path
 */
export const getXlsxPath = (caseDir: string): string => {
  return `${caseDir}${PATH_SEP}${FILE_NAMES.XLSX}`;
};

/**
 * Generate config file path
 */
export const getConfigPath = (caseDir: string): string => {
  return `${caseDir}${PATH_SEP}${FILE_NAMES.CONFIG}`;
};

/**
 * Generate GeoJSON file path
 */
export const getGeoJSONPath = (caseDir: string): string => {
  return `${caseDir}${PATH_SEP}${FILE_NAMES.GEOJSON}`;
};

/**
 * Split file string into array
 */
export const splitFileString = (fileString: string): string[] => {
  if (!fileString || fileString.trim() === '') return [];
  return fileString.split(FILE_SEPARATOR).map(f => f.trim()).filter(Boolean);
};

/**
 * Join file array into string
 */
export const joinFileArray = (files: string[]): string => {
  return files.filter(Boolean).join(FILE_SEPARATOR);
};

/**
 * Extract filename from full path
 */
export const getFileName = (path: string): string => {
  return path.split('/').pop() || path.split('\\').pop() || path;
};

/**
 * Supported image extensions
 */
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

/**
 * Supported video extensions
 */
export const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'];

/**
 * Check if file is an image
 */
export const isImageFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return IMAGE_EXTENSIONS.includes(ext);
};

/**
 * Check if file is a video
 */
export const isVideoFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return VIDEO_EXTENSIONS.includes(ext);
};
