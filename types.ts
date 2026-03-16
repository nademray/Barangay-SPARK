
export interface Report {
  'LGU/BARANGAY': string;
  'REPORT TYPE': string;
  'FREQUENCY': string;
  'STATUS': string;
  'LAST UPDATED': string;
  'DATA SUMMARY': string;
  'ACTION PLAN': string;
  'REMARKS': string;
  details?: any;
  isOverdue?: boolean;
  isLocked?: boolean;
  canUpdate?: boolean;
  windowStatus?: 'Open' | 'Closed' | 'Waiting';
  nextOpeningDate?: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'url' | 'readonly' | 'textarea' | 'file';
  options?: string[]; // For select types
  placeholder?: string;
  multiple?: boolean; // Allow multiple file selection
  required?: boolean; // Whether the field must be filled
}

export interface ColumnDefinition {
  header: string;
  accessor: string; // key in details object or root property
  type?: 'text' | 'link' | 'date' | 'badge';
}

export interface ReportDefinition {
  id: string; // Unique key (e.g., 'Road Clearing')
  title: string; // Display title
  category: 'Monthly' | 'Quarterly' | 'Weekly' | 'Semestral' | 'Annual' | 'Barangay' | 'Quality Policy';
  frequency: string;
  backendFetchFunction: string; // Name of GAS function to get data
  backendUpdateFunction: string; // Name of GAS function to update data
  googleDriveFolderId?: string; // Optional: Specific Drive Folder ID for uploads
  templateUrl?: string; // Link to the Excel/Google Sheet template
  extensionUntil?: string; // ISO Date (e.g. '2025-04-15') to force unlock reports
  deadline: {
    day: number;
    frequency: 'monthly' | 'quarterly' | 'weekly';
    months?: number[]; // For quarterly
    description: string;
  };
  columns: ColumnDefinition[]; // For the Table view
  fields: FieldDefinition[]; // For the Edit Modal
  isCustom?: boolean; // If true (like FTJS), handle manually in App.tsx
  isInventory?: boolean; // If true, exclude from compliance monitoring/stats
}
