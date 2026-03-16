
import { ReportDefinition } from './types';

export const BARANGAY_LEVEL_REPORT_IDS = [
    'FTJS', 
    'Kasambahay', 
    'VAW-VAC Incidents',
    'BARCO Brgy',
    'ICAD-IEC Brgy',
    'Kalinisan Brgy',
    'HAPAG',
    'HAPAG 2'
];

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'HAPAG',
    title: 'HAPAG (Halina’t Magtanim ng Gulay)',
    category: 'Barangay',
    frequency: 'Monthly',
    backendFetchFunction: 'getHAPAGData',
    backendUpdateFunction: 'updateHAPAGRow',
    deadline: {
       frequency: 'monthly',
       day: 28,
       description: 'Every 28th of the month'
    },
    columns: [
      { header: 'City/Mun', accessor: 'city' },
      { header: 'Barangay', accessor: 'barangay' },
      { header: 'Income', accessor: 'earnedIncome' },
      { header: 'Report Submitted?', accessor: 'submittedSemestralReport' },
      { header: 'Garden Photos', accessor: 'gardenPictures', type: 'link' },
      { header: 'Last Updated', accessor: 'LAST UPDATED' }
    ],
    fields: [
      { key: 'ampalaya', label: 'Ampalaya',  type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'bawang', label: 'Bawang',  type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'broccoli', label: 'Broccoli', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'kalabasa', label: 'Kalabasa', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'kamatis', label: 'Kamatis', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'kamote', label: 'Kamote', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'labanos', label: 'Labanos', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'litsugas', label: 'Litsugas (lettuce)', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'mustasa', label: 'Mustasa', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'okra', label: 'Okra', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'patola', label: 'Patola', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'pechay', label: 'Pechay', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'pipino', label: 'Pipino (cucumber)', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'repolyo', label: 'Repolyo', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'sayote', label: 'Sayote', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'sibuyas', label: 'Sibuyas', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'sigarilyas', label: 'Sigarilyas', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'sitaw', label: 'Sitaw', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'talong', label: 'Talong', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'upo', label: 'Upo', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'otherVegetables', label: 'Other Vegetables', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'mangga', label: 'Mangga', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'saging', label: 'Saging', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'papaya', label: 'Papaya', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'lansones', label: 'Lansones', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'rambutan', label: 'Rambutan', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'guava', label: 'Guava', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'buko', label: 'Buko', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'atis', label: 'Atis', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'kaimito', label: 'Kaimito (Star Apple)', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'lemon', label: 'Lemon', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'dalandan', label: 'Dalandan', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'abokado', label: 'Abokado (avocado)', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'otherFruits', label: 'Other Fruits', type: 'number', placeholder: 'weight (in kgs)' },
      { key: 'earnedIncome', label: 'Amount of Earned Income in Pesos', type: 'number' },
      { key: 'submittedSemestralReport', label: 'Submitted Semestral Report? (1=YES, 0=NO, NA)', type: 'select', options: ['1', '0', 'NA'], required: true },
      { key: 'gardenPictures', label: 'Barangay Garden Photos (Google Drive Link)', type: 'url', placeholder: 'Paste link here...' },
      { key: 'remarks', label: 'Remarks', type: 'textarea' }
    ]
  },
  {
    id: 'HAPAG 2',
    title: 'HAPAG Phase 2 (Barangay)',
    category: 'Barangay',
    frequency: 'Monthly',
    backendFetchFunction: 'getHAPAG2Data',
    backendUpdateFunction: 'updateHAPAG2Row',
    deadline: {
       frequency: 'monthly',
       day: 28,
       description: 'Every 28th of the month'
    },
    columns: [
      { header: 'City/Mun', accessor: 'city' },
      { header: 'Barangay', accessor: 'barangay' },
      { header: 'Garden?', accessor: 'establishedGarden' },
      { header: 'Area (sqm)', accessor: 'totalArea' },
      { header: 'Ordinance', accessor: 'withOrdinance' },
      { header: 'SBM Assigned', accessor: 'designatedSBM' },
      { header: 'SK Assigned', accessor: 'designatedSK' },
      { header: 'BNC Org', accessor: 'organizedBNC' },
      { header: 'Households', accessor: 'totalHouseholds' },
      { header: 'Last Updated', accessor: 'LAST UPDATED' }
    ],
    fields: [
      { key: 'establishedGarden', label: 'With Established Community Garden', type: 'select', options: ['1', '0'], required: true },
      { key: 'totalArea', label: 'Total Land Area of the Established Community Garden (in square meter)', type: 'number' },
      { key: 'withOrdinance', label: 'With Ordinance for the Establishment of a Barangay Community Garden', type: 'select', options: ['1', '0'] },
      { key: 'designatedSBM', label: 'With designated SBM to Manage the Barangay Community Garden', type: 'select', options: ['1', '0'] },
      { key: 'designatedSK', label: 'With designated SK Chairperson or Youth Leader to assist in the establishment, operation, and maintenance of the Barangay Community Garden', type: 'select', options: ['1', '0'] },
      { key: 'organizedBNC', label: 'With organized Barangay Nutrition Committee (BNC)', type: 'select', options: ['1', '0'] },
      { key: 'formulatedNAP', label: 'With formulated Barangay Nutrition Action Plans (NAP)', type: 'select', options: ['1', '0'] },
      { key: 'approvedBDP', label: 'With approved BDP and AIP integrating Nutritional PPAs', type: 'select', options: ['1', '0'] },
      { key: 'advocacyCampaign', label: 'Conducted at least One (1) Advocacy Campaign/ Awareness on community household gardening', type: 'select', options: ['1', '0'] },
      { key: 'recordsSeedlings', label: 'With Records on the Types of Vegetable and/or Fruit Seedlings Planted', type: 'select', options: ['1', '0'] },
      { key: 'recordsHarvested', label: 'With Records on the Types of Vegetables and/or Fruits Harvested', type: 'select', options: ['1', '0'] },
      { key: 'totalHouseholds', label: 'Total No. of Households with Vegetable/Backyard Garden', type: 'number' },
      { key: 'groupVolunteers', label: 'With Established Group of Volunteers on the implementation of the Community Garden', type: 'select', options: ['1', '0'] },
      { key: 'plantedBamboo', label: 'Has planted bamboo (kawayan)', type: 'select', options: ['1', '0'] }
    ]
  },
  {
    id: 'FTJS',
    title: 'First Time JobSeekers (Barangay)',
    category: 'Barangay',
    frequency: 'Monthly',
    backendFetchFunction: 'getFTJSData',
    backendUpdateFunction: 'updateFTJSRow',
    isCustom: true,
    deadline: {
       frequency: 'monthly',
       day: 10,
       description: 'Every 10th of the ensuing month'
    },
    columns: [
      { header: 'City/Mun', accessor: 'city' },
      { header: 'Barangay', accessor: 'barangay' },
      { header: 'Beneficiaries', accessor: 'totalBeneficiaries' },
      { header: 'Male', accessor: 'male' },
      { header: 'Female', accessor: 'female' },
      { header: 'HS/Elem', accessor: 'hs' },
      { header: 'College', accessor: 'college' },
      { header: 'OSY', accessor: 'osy' }
    ],
    fields: [
      { key: 'totalBeneficiaries', label: 'Total Beneficiaries', type: 'number', required: true },
      { key: 'male', label: 'Male', type: 'number' },
      { key: 'female', label: 'Female', type: 'number' },
      { key: 'hs', label: 'HS/Elem', type: 'number' },
      { key: 'college', label: 'College', type: 'number' },
      { key: 'osy', label: 'OSY', type: 'number' }
    ]
  },
  {
    id: 'Kalinisan Brgy',
    title: 'Kalinisan (Weekly)',
    category: 'Weekly',
    frequency: 'Weekly',
    backendFetchFunction: 'getKalinisanBrgyData',
    backendUpdateFunction: 'updateKalinisanBrgyRow',
    deadline: {
      frequency: 'weekly',
      day: 1,
      description: 'Every Monday following the activity week'
    },
    columns: [
      { header: 'City/Mun', accessor: 'city' },
      { header: 'Barangay', accessor: 'barangay' },
      { header: 'Week Covered', accessor: 'weekCovered' },
      { header: 'Participants', accessor: 'totalParticipants' },
      { header: 'Officials', accessor: 'officialsParticipated' },
      { header: 'Sacks', accessor: 'wasteSacks' },
      { header: 'Kilos', accessor: 'wasteKg' },
      { header: 'Sites', accessor: 'cleanupSites' },
      { header: 'Last Updated', accessor: 'LAST UPDATED' }
    ],
    fields: [
      { key: 'weekCovered', label: 'Week Covered (Date)', type: 'select', options: [], required: true },
      { key: 'totalParticipants', label: 'Total No. of Participants', type: 'number' },
      { key: 'officialsParticipated', label: 'Total No. of LGU Officials Participated', type: 'number' },
      { key: 'wasteSacks', label: 'Total Waste Collected (Sacks)', type: 'number' },
      { key: 'wasteKg', label: 'Total Waste Collected (KG)', type: 'number' },
      { key: 'cleanupSites', label: 'Total No. of Clean-up Sites', type: 'number' },
    ]
  },
  {
    id: 'ICAD-IEC Brgy',
    title: 'ICAD-IEC (Barangay)',
    category: 'Barangay',
    frequency: 'Monthly',
    backendFetchFunction: 'getICADIECData',
    backendUpdateFunction: 'updateICADIECRow',
    deadline: {
      frequency: 'monthly',
      day: 25,
      description: 'Every 25th day of the month'
    },
    columns: [
      { header: 'City/Municipality', accessor: 'city' },
      { header: 'Barangay', accessor: 'barangay' },
      { header: 'Distributed Materials', accessor: 'distributedMaterials' },
      { header: 'Remarks', accessor: 'remarks' }
    ],
    fields: [
      { 
        key: 'distributedMaterials', 
        label: 'NUMBER OF DISTRIBUTED ICAD INFO AND IEC MATERIALS', 
        type: 'number', 
        required: true,
        placeholder: 'Enter total number'
      },
      { 
        key: 'remarks', 
        label: 'Remarks', 
        type: 'textarea', 
        placeholder: 'Enter any additional notes...' 
      }
    ]
  },
  {
    id: 'Kasambahay',
    title: 'Kasambahay (Barangay)',
    category: 'Barangay',
    frequency: 'Monthly',
    backendFetchFunction: 'getKasambahayData',
    backendUpdateFunction: 'updateKasambahayRow',
    deadline: {
      frequency: 'monthly',
      day: 30,
      description: 'Every 30th day of the month'
    },
    columns: [
      { header: 'City/Mun', accessor: 'city' },
      { header: 'Barangay', accessor: 'barangay' },
      { header: 'Registered', accessor: 'withRegistered' },
      { header: 'Desk', accessor: 'establishedDesk' },
      { header: 'Officer', accessor: 'designatedOfficer' },
      { header: 'Ordinance', accessor: 'ordinanceCount' },
      { header: 'Flow Chart', accessor: 'postedFlowChart' },
      { header: 'Masterlist', accessor: 'updatedMasterlist' }
    ],
    fields: [
      { key: 'withRegistered', label: 'With Registered Kasambahay (1=YES, 0=NO)', type: 'select', options: ['1', '0'] },
      { key: 'establishedDesk', label: 'Established Kasambahay Desk (1=YES, 0=NO)', type: 'select', options: ['1', '0'] },
      { key: 'designatedOfficer', label: 'Designated Kasambahay Desk Officer (1=YES, 0=NO)', type: 'select', options: ['1', '0'] },
      { key: 'ordinanceCount', label: 'No. of EO/Ordinance/s Enacted', type: 'number' },
      { key: 'postedFlowChart', label: 'Posted Kasambahay Flow Chart (1=YES, 0=NO)', type: 'select', options: ['1', '0'] },
      { key: 'updatedMasterlist', label: 'With Updated Masterlist (1=YES, 0=NO)', type: 'select', options: ['1', '0'] }
    ]
  },
  {
    id: 'VAW-VAC Incidents',
    title: 'VAW-VAC Incidents (Barangay)',
    category: 'Barangay',
    frequency: 'Quarterly',
    backendFetchFunction: 'getVawVacData',
    backendUpdateFunction: 'updateVawVacRow',
    deadline: {
      frequency: 'quarterly',
      day: 5,
      months: [1, 4, 7, 10],
      description: 'Every 5th day of the ensuing quarter'
    },
    columns: [
      { header: 'City/Mun', accessor: 'city' },
      { header: 'Barangay', accessor: 'barangay' },
      { header: 'Brgys w/ Victims', accessor: 'brgysWithVictims' },
      { header: 'Total Victims', accessor: 'totalVictims' },
      { header: 'Physical', accessor: 'physicalAbuse' },
      { header: 'Sexual', accessor: 'sexualAbuse' },
      { header: 'Psych.', accessor: 'psychAbuse' },
      { header: 'Economic', accessor: 'economicAbuse' },
      { header: 'BPO', accessor: 'issuedBpo' },
      { header: 'LSWDO', accessor: 'referredLswdo' },
      { header: 'PNP', accessor: 'referredPnp' },
      { header: 'NBI', accessor: 'referredNbi' },
      { header: 'Medical', accessor: 'referredMedical' },
      { header: 'Legal', accessor: 'referredLegal' },
      { header: 'Court', accessor: 'referredCourt' },
      { header: 'Others', accessor: 'referredOthers' }
    ],
    fields: [
      { key: 'brgysWithVictims', label: 'Total No. of Barangays with VAW Victims', type: 'number' },
      { key: 'totalVictims', label: 'Total No. of VAW Victims', type: 'number' },
      { key: 'physicalAbuse', label: 'Physical Abuse', type: 'number' },
      { key: 'sexualAbuse', label: 'Sexual Abuse', type: 'number' },
      { key: 'psychAbuse', label: 'Psychological/Emotional Abuse', type: 'number' },
      { key: 'economicAbuse', label: 'Economic Abuse', type: 'number' },
      { key: 'issuedBpo', label: 'Issued BPO', type: 'number' },
      { key: 'referredLswdo', label: 'Referred to Lswdo', type: 'number' },
      { key: 'referredPnp', label: 'Referred to PNP', type: 'number' },
      { key: 'referredNbi', label: 'Referred to NBI', type: 'number' },
      { key: 'referredMedical', label: 'Referred for Medical Treatment', type: 'number' },
      { key: 'referredLegal', label: 'Referred for Legal Assistance', type: 'number' },
      { key: 'referredCourt', label: 'Referred to Court', type: 'number' },
      { key: 'others', label: 'Others (ex: Referred to NGOs, FBOs)', type: 'number' }
    ]
  },
  {
    id: 'BARCO Brgy',
    title: 'BARCO (Barangay)',
    category: 'Barangay',
    frequency: 'Monthly',
    backendFetchFunction: 'getBarcoBrgyData',
    backendUpdateFunction: 'updateBarcoBrgyRow',
    deadline: {
      frequency: 'monthly',
      day: 20,
      description: 'Every 20th day of the Month'
    },
    columns: [
      { header: 'City/Mun', accessor: 'city' },
      { header: 'Barangay', accessor: 'barangay' },
      { header: 'Conducted?', accessor: 'conducted' },
      { header: 'Inventory', accessor: 'roadInventory' },
      { header: 'Photos', accessor: 'url', type: 'link' },
      { header: 'Total Roads', accessor: 'totalRoads' },
      { header: 'Cleared', accessor: 'clearedRoads' },
      { header: 'Action', accessor: 'actionTaken' }
    ],
    fields: [
      { key: 'conducted', label: 'Conducted BaRCO? (1=Yes, 0=No)', type: 'select', options: ['1', '0'] },
      { key: 'roadInventory', label: 'Inventory of Roads/Streets/Alleys', type: 'text', placeholder: 'Location/Street Name/Alley' },
      { key: 'url', label: 'Photo/Video Documentation (Link)', type: 'text', placeholder: 'Paste link here...' },
      { key: 'totalRoads', label: 'Road Length in Meters(M)', type: 'number' },
      { key: 'clearedRoads', label: 'Date of Clearing Operation', type: 'text' },
      { key: 'actionTaken', label: 'Action Taken', type: 'text' }
    ]
  }
];
