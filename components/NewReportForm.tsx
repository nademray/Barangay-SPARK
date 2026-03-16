
import React, { useState } from 'react';
import { Report } from '../types';

type NewReportData = Omit<Report, 'LAST UPDATED'>;

interface NewReportFormProps {
  onSubmit: (report: NewReportData) => void;
  onCancel: () => void;
  existingLgus: string[];
  existingReportTypes: string[];
}

const NewReportForm: React.FC<NewReportFormProps> = ({ onSubmit, onCancel, existingLgus, existingReportTypes }) => {
  const [formData, setFormData] = useState<NewReportData>({
    'LGU/BARANGAY': '',
    'REPORT TYPE': '',
    'FREQUENCY': 'Annual',
    'STATUS': 'Pending',
    'DATA SUMMARY': '',
    'ACTION PLAN': '',
    'REMARKS': '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData['LGU/BARANGAY'] || !formData['REPORT TYPE'] || !formData['DATA SUMMARY']) {
      setError('Please fill out all required fields: LGU/BARANGAY, Report Type, and Data Summary.');
      return;
    }
    setError('');
    onSubmit(formData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 transition-all duration-300 ease-in-out">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Report</h3>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="LGU/BARANGAY" className="block text-sm font-medium text-gray-700 mb-1">LGU/BARANGAY *</label>
          <input
            type="text"
            id="LGU/BARANGAY"
            name="LGU/BARANGAY"
            value={formData['LGU/BARANGAY']}
            onChange={handleChange}
            list="lgu-datalist"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <datalist id="lgu-datalist">
            {existingLgus.filter(lgu => lgu !== 'All').map(lgu => <option key={lgu} value={lgu} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor="REPORT TYPE" className="block text-sm font-medium text-gray-700 mb-1">Report Type *</label>
          <input
            type="text"
            id="REPORT TYPE"
            name="REPORT TYPE"
            value={formData['REPORT TYPE']}
            onChange={handleChange}
            list="report-type-datalist"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
           <datalist id="report-type-datalist">
            {existingReportTypes.filter(type => type !== 'All').map(type => <option key={type} value={type} />)}
          </datalist>
        </div>
         <div>
          <label htmlFor="FREQUENCY" className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select
            id="FREQUENCY"
            name="FREQUENCY"
            value={formData.FREQUENCY}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option>Annual</option>
            <option>Semestral</option>
            <option>Quarterly</option>
            <option>Monthly</option>
            <option>Weekly</option>
          </select>
        </div>
        <div>
          <label htmlFor="STATUS" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            id="STATUS"
            name="STATUS"
            value={formData.STATUS}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option>Pending</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="DATA SUMMARY" className="block text-sm font-medium text-gray-700 mb-1">Data Summary *</label>
          <textarea
            id="DATA SUMMARY"
            name="DATA SUMMARY"
            value={formData['DATA SUMMARY']}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          ></textarea>
        </div>
         <div className="md:col-span-2">
          <label htmlFor="ACTION PLAN" className="block text-sm font-medium text-gray-700 mb-1">Action Plan</label>
          <textarea
            id="ACTION PLAN"
            name="ACTION PLAN"
            value={formData['ACTION PLAN']}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>
         <div className="md:col-span-2">
          <label htmlFor="REMARKS" className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            id="REMARKS"
            name="REMARKS"
            value={formData['REMARKS']}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>
        <div className="md:col-span-2 flex justify-end items-center gap-4 pt-4">
             <p className="text-xs text-gray-500 italic mr-auto">Note: Submitted reports are added locally and will not be saved to the database.</p>
            <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 transition-colors">
                Cancel
            </button>
            <button type="submit" className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
                Submit Report
            </button>
        </div>
      </form>
    </div>
  );
};

export default NewReportForm;