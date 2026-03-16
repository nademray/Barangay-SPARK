
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Report, ReportDefinition } from './types';
import { fetchReports, updateReportData, formatTimestamp, LGU_LIST } from './services/dataService';
import { REPORT_DEFINITIONS } from './reportDefinitions'; 
import StatCard from './components/StatCard';
import { LguComplianceMatrix } from './components/ReportsTable';
import DynamicReportTable from './components/DynamicReportTable';
import EditReportModal from './components/EditReportModal';
import SubmissionStatusView from './components/SubmissionStatusView';
import WelcomeModal from './components/WelcomeModal';
import ActionLogSheet from './components/ActionLogSheet';
import ComplianceChecklist from './components/ComplianceChecklist';
import ProvinceSummaryView from './components/ProvinceSummaryView';
import BarangayLeaderboardView from './components/BarangayLeaderboardView';
import { RefreshIcon } from './components/Icons';

function calculateReportWindow(def: ReportDefinition) {
  const now = new Date();
  const year = now.getFullYear();
  const day = def.deadline.day;
  const frequency = def.deadline.frequency || def.category.toLowerCase();
  
  // UPDATED: Changed from 7 to 12 days lead time for non-weekly reports
  const lead = (frequency === 'weekly' || def.category === 'Weekly') ? 3 : 12;
  const grace = def.id === 'FTJS' ? 0 : def.id === 'Kalinisan Brgy' ? 1 : (frequency === 'weekly' || def.category === 'Weekly') ? 3 : 5;

  const getDeadlineForMonth = (m: number, y: number) => new Date(y, m, day, 23, 59, 59);

  let targetDeadline: Date;
  if (frequency === 'weekly') {
      const jan1 = new Date(year, 0, 1);
      const firstDeadline = new Date(jan1);
      while (firstDeadline.getDay() !== day) firstDeadline.setDate(firstDeadline.getDate() + 1);
      
      targetDeadline = new Date(firstDeadline);
      while (targetDeadline < now) {
          targetDeadline.setDate(targetDeadline.getDate() + 7);
      }
      const prevDeadline = new Date(targetDeadline);
      prevDeadline.setDate(prevDeadline.getDate() - 7);
      const prevGraceEnd = new Date(prevDeadline);
      prevGraceEnd.setDate(prevGraceEnd.getDate() + grace);
      
      if (now <= prevGraceEnd) {
          targetDeadline = prevDeadline;
      }
  } else {
      targetDeadline = getDeadlineForMonth(now.getMonth(), year);
      const currentGraceEnd = new Date(targetDeadline);
      currentGraceEnd.setDate(currentGraceEnd.getDate() + grace);
      
      if (now > currentGraceEnd) {
          targetDeadline = getDeadlineForMonth(now.getMonth() + 1, year);
      }
      
      if (def.deadline.months && def.deadline.months.length > 0) {
          const validMonths = def.deadline.months.map(m => m - 1);
          let targetMonth = validMonths.find(m => m >= now.getMonth());
          if (targetMonth === undefined) {
              targetMonth = validMonths[0];
              targetDeadline = getDeadlineForMonth(targetMonth, year + 1);
          } else {
              targetDeadline = getDeadlineForMonth(targetMonth, year);
          }
      }
  }

  const windowOpen = new Date(targetDeadline);
  windowOpen.setDate(windowOpen.getDate() - lead);
  const windowClose = new Date(targetDeadline);
  windowClose.setDate(windowClose.getDate() + grace);

  const isOpen = now >= windowOpen && now <= windowClose;
  const isWaiting = now < windowOpen;
  const isClosed = now > windowClose;

  return { targetDeadline, windowOpen, windowClose, isOpen, isWaiting, isClosed };
}

const App: React.FC = () => {
  const [userContext, setUserContext] = useState<string | null>(null);
  const [barangayContext, setBarangayContext] = useState<string | null>(null);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState("Monitoring Dashboard");
  const [activeSubTab, setActiveSubTab] = useState<string>(""); 
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dashboardView, setDashboardView] = useState<'matrix' | 'submission'>('submission');
  const [loading, setLoading] = useState(true);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, 'locked' | 'unlocked' | null>>({});

  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("Updating...");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = useMemo(() => {
    const baseTabs = ["Monitoring Dashboard", "Compliance Checklist", "Action Logsheet", "Barangay Leaderboard"];
    if (userContext === 'Province') {
      return [...baseTabs, "Submission Tally"];
    }
    return baseTabs;
  }, [userContext]);

  const barangaysMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    allReports.forEach(r => {
        if (r.details?.city && r.details?.barangay) {
            let city = r.details.city.toUpperCase().trim();
            
            // Debug log to see what raw city names are coming in
            // console.log('Raw City:', city);

            // Normalization for specific LGUs to match LGU_LIST
            if (city === 'CITY OF CATBALOGAN' || city === 'CATBALOGAN CITY' || city === 'CATBALOGAN' || city === 'CITY OF CATBALOGAN (CAPITAL)') {
                city = 'CITY OF CATBALOGAN (Capital)';
            }
            if (city === 'CALBAYOG CITY' || city === 'CALBAYOG') {
                city = 'CITY OF CALBAYOG';
            }

            if (!map[city]) map[city] = new Set();
            map[city].add(r.details.barangay);
        }
    });
    const finalMap: Record<string, string[]> = {};
    Object.keys(map).forEach(city => {
        finalMap[city] = Array.from(map[city]).sort();
    });
    return finalMap;
  }, [allReports]);

  const activeReportDef = useMemo(() => REPORT_DEFINITIONS.find(d => d.id === activeSubTab), [activeSubTab]);

  const handleManualOverride = (reportId: string, state: 'locked' | 'unlocked' | null) => {
      setManualOverrides(prev => ({ ...prev, [reportId]: state }));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const reports = await fetchReports();
      const now = new Date();
      
      const syncTs = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      setLastSyncedTime(syncTs);

      const processedReports: Report[] = reports.map(report => {
          const def = REPORT_DEFINITIONS.find(d => d.id === report['REPORT TYPE']);
          if (!def) return report;

          const { windowOpen, isOpen, isWaiting, isClosed } = calculateReportWindow(def);
          const lastUpdateDate = new Date(report['LAST UPDATED']);
          const isFresh = !isNaN(lastUpdateDate.getTime()) && lastUpdateDate >= windowOpen;
          
          let currentStatus = report.STATUS;
          let isLocked = false;

          if (isOpen) {
              currentStatus = isFresh ? 'Completed' : 'Pending';
              isLocked = false;
          } else if (isWaiting) {
              currentStatus = report.STATUS === 'Completed' ? 'Completed' : 'Waiting';
              isLocked = true;
          } else if (isClosed) {
              if (isFresh) {
                  currentStatus = 'Completed';
                  isLocked = true;
              } else {
                  currentStatus = 'Late';
                  isLocked = false;
              }
          }

          if (def.extensionUntil && now <= new Date(def.extensionUntil)) {
              isLocked = false;
          }

          // APPLY MANUAL OVERRIDES
          const override = manualOverrides[def.id];
          if (override === 'unlocked') isLocked = false;
          else if (override === 'locked') isLocked = true;

          return {
              ...report,
              STATUS: currentStatus,
              isLocked,
              isOverdue: currentStatus === 'Late',
              windowStatus: (isOpen ? 'Open' : isWaiting ? 'Waiting' : 'Closed') as 'Open' | 'Closed' | 'Waiting',
              nextOpeningDate: formatTimestamp(windowOpen)
          };
      });

      setAllReports(processedReports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [manualOverrides]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUserSelection = (lgu: string, brgy: string) => {
      setUserContext(lgu);
      setBarangayContext(brgy);
      setDashboardView(lgu === 'Province' ? 'matrix' : 'submission');
      setActiveTab("Monitoring Dashboard");
  };

  const handleLogout = () => {
      setUserContext(null);
      setBarangayContext(null);
      setActiveSubTab("");
      setStatusFilter("All");
  };

  useEffect(() => {
    if (!userContext) return;
    let reports = allReports;
    if (userContext !== 'Province') {
        reports = reports.filter(r => 
            (r.details?.city === userContext) && 
            (barangayContext === 'All' || r.details?.barangay === barangayContext)
        );
    }
    if (activeSubTab && activeTab === "Monitoring Dashboard") {
        reports = reports.filter(r => r['REPORT TYPE'] === activeSubTab);
    }
    setFilteredReports(reports);
  }, [allReports, userContext, barangayContext, activeTab, activeSubTab]);

  const stats = useMemo(() => {
    const total = REPORT_DEFINITIONS.length;
    const completedTypesCount = REPORT_DEFINITIONS.reduce((acc, def) => {
        const typeReports = filteredReports.filter(r => r['REPORT TYPE'] === def.id);
        if (typeReports.length === 0) return acc;
        const isFullyCompliant = typeReports.every(r => r.STATUS === 'Completed');
        return isFullyCompliant ? acc + 1 : acc;
    }, 0);
    return { totalReports: total, completedReports: completedTypesCount, pendingReports: total - completedTypesCount };
  }, [filteredReports]);

  const handleNavigateToReport = (def: ReportDefinition) => { 
    setActiveSubTab(def.id); 
    setActiveTab("Monitoring Dashboard");
  };
  
  const handleBackToDashboard = () => setActiveSubTab("");

  const handleSaveReport = async (updatedDetails: any) => {
    if (!editingReport) return;
    setLoading(true);
    try {
        const idKey = updatedDetails.project || editingReport['LGU/BARANGAY'];
        await updateReportData(editingReport['REPORT TYPE'], idKey, updatedDetails);
        await loadData();
        setEditingReport(null);
    } catch (err) { 
        alert("Save failed"); 
    } finally { 
        setLoading(false); 
    }
  };

  const lguMatrixData = useMemo(() => {
      if (userContext !== 'Province') return [];
      return LGU_LIST.map(lgu => {
          const rowData: any = { lgu };
          let compCount = 0;
          REPORT_DEFINITIONS.forEach(def => {
              const lguReports = allReports.filter(r => (r.details?.city === lgu) && r['REPORT TYPE'] === def.id);
              const totalBrgys = Array.from(new Set(allReports.filter(r => r.details?.city === lgu).map(r => r.details?.barangay))).length || 1;
              const completedBrgys = lguReports.filter(r => r.STATUS === 'Completed').length;
              rowData[def.id] = { 
                  status: completedBrgys === totalBrgys ? 'Completed' : completedBrgys > 0 ? 'Partial' : 'Pending',
                  date: `${completedBrgys}/${totalBrgys}`
              };
              if (completedBrgys === totalBrgys) compCount++;
          });
          rowData.completionRate = Math.round((compCount / REPORT_DEFINITIONS.length) * 100);
          rowData.completedCount = compCount; 
          return rowData;
      });
  }, [allReports, userContext]);

  const todayPillText = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  const timeDisplay = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 selection:bg-blue-100 flex flex-col">
      {!userContext && <WelcomeModal lgus={LGU_LIST} barangaysMap={barangaysMap} onSelect={handleUserSelection} />}
      
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col items-center border animate-fade-in-up">
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Syncing Data...</h3>
                <p className="text-xs text-slate-500">Connecting to Barangay Records database</p>
            </div>
        </div>
      )}

      {userContext && (
        <div className="mx-auto p-4 md:p-8 w-full max-w-[1600px] flex-1 flex flex-col">
          <header className="mb-6 bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border sticky top-4 z-30 transition-all">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl border shadow-inner">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c9/Department_of_the_Interior_and_Local_Government_%28DILG%29_Seal_-_Logo.svg" alt="DILG" className="h-10" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter">DILG <span className="text-blue-600">SPARK</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Samar Provincial Accomplishment & Report Keeper</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
                    <div className="flex flex-col items-end">
                        <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 mb-1 flex items-center shadow-sm">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                            Today is {todayPillText}
                        </div>
                        <div className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter tabular-nums leading-none">
                            {timeDisplay}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 border-slate-100 md:border-l md:pl-8">
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Database Sync</div>
                            <div className="text-xs font-bold text-slate-600 tabular-nums">Synced: {lastSyncedTime}</div>
                        </div>
                        <button 
                            onClick={loadData} 
                            disabled={loading}
                            className={`p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-white transition-all shadow-sm group ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Refresh Database"
                        >
                            <div className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}>
                                <RefreshIcon />
                            </div>
                        </button>
                    </div>

                    <div className="flex items-center gap-4 border-slate-100 md:border-l md:pl-8">
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated as</div>
                            <div className="text-sm font-black text-slate-700">{barangayContext === 'All' ? userContext : `${barangayContext}, ${userContext}`}</div>
                        </div>
                        <button onClick={handleLogout} className="p-3 bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all border border-slate-100 shadow-sm" title="Logout">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
          </header>

          <nav className="flex flex-wrap gap-2 mb-8 bg-white/60 p-1.5 rounded-2xl shadow-sm border backdrop-blur-sm overflow-x-auto no-scrollbar">
            {tabs.map((item) => (
                <button key={item} onClick={() => { setActiveTab(item); setActiveSubTab(""); setStatusFilter("All"); }} className={`flex-1 py-2.5 px-6 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === item ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}>
                  {item}
                </button>
            ))}
          </nav>

          <main className="animate-fade-in flex-1">
              {activeTab === "Monitoring Dashboard" && (
                  <>
                      {!activeSubTab ? (
                          <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                  <StatCard title="Total Reports" value={stats.totalReports} subtitle="Requirements" color="bg-blue-600" onClick={() => setStatusFilter('All')} />
                                  <StatCard title="Complied" value={stats.completedReports} subtitle="Full Submissions" color="bg-emerald-600" onClick={() => setStatusFilter('Completed')} />
                                  <StatCard title="Pending" value={stats.pendingReports} subtitle="Action Items" color="bg-amber-500" onClick={() => setStatusFilter('Pending')} />
                                  <StatCard title="Status" value={stats.completedReports === stats.totalReports ? 'EXCELLENT' : 'ONGOING'} subtitle="Performance" color="bg-slate-700" onClick={() => setDashboardView(dashboardView === 'matrix' ? 'submission' : 'matrix')} />
                              </div>

                              {userContext === 'Province' && (
                                  <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-xl border w-fit">
                                      <button onClick={() => setDashboardView('matrix')} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${dashboardView === 'matrix' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Matrix View</button>
                                      <button onClick={() => setDashboardView('submission')} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${dashboardView === 'submission' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Card View</button>
                                  </div>
                              )}

                              {dashboardView === 'matrix' && userContext === 'Province' ? (
                                  <LguComplianceMatrix data={lguMatrixData} columns={REPORT_DEFINITIONS.map(d => d.id)} onFocus={(lgu) => setUserContext(lgu)} />
                              ) : (
                                  <SubmissionStatusView reports={filteredReports} categoryFilter="All" statusFilter={statusFilter} onNavigate={handleNavigateToReport} manualOverrides={manualOverrides} />
                              )}
                          </>
                      ) : (
                          <div className="animate-fade-in">
                              <div className="flex items-center justify-between mb-6">
                                  <button onClick={handleBackToDashboard} className="flex items-center text-slate-500 hover:text-blue-600 font-bold transition-all">
                                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                      Back to Overview
                                  </button>
                                  <div className="text-right">
                                    <h3 className="text-xl font-black text-slate-800">{activeReportDef?.title}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Policy: {activeReportDef?.category} Window</p>
                                  </div>
                              </div>
                              <DynamicReportTable 
                                definition={activeReportDef!} 
                                reports={filteredReports} 
                                onEdit={setEditingReport} 
                                isProvince={userContext === 'Province'} 
                                manualOverrideState={manualOverrides[activeReportDef!.id] || null}
                                onSetOverride={(state) => handleManualOverride(activeReportDef!.id, state)}
                              />
                          </div>
                      )}
                  </>
              )}
              {activeTab === "Compliance Checklist" && <ComplianceChecklist reports={filteredReports} currentLgu={barangayContext === 'All' ? userContext! : barangayContext!} onNavigate={handleNavigateToReport} />}
              {activeTab === "Action Logsheet" && <ActionLogSheet reports={filteredReports} currentLgu={barangayContext === 'All' ? userContext! : `${barangayContext}, ${userContext}`} />}
              {activeTab === "Submission Tally" && userContext === 'Province' && <ProvinceSummaryView reports={allReports} lgus={LGU_LIST} barangaysMap={barangaysMap} />}
              {activeTab === "Barangay Leaderboard" && <BarangayLeaderboardView reports={allReports} userLgu={userContext!} lgus={LGU_LIST} barangaysMap={barangaysMap} />}
          </main>
          
          <footer className="mt-auto py-8 text-center border-t border-slate-100">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">© 2025 DILG SAMAR | Nadem Ray Uy</p>
          </footer>
        </div>
      )}

      {editingReport && <EditReportModal report={editingReport} onSave={handleSaveReport} onClose={() => setEditingReport(null)} />}
    </div>
  );
};

export default App;
