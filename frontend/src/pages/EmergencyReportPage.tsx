import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api/client';

export const EmergencyReportPage: React.FC = () => {
  const [reportData, setReportData] = useState<{
    markdown: string;
    generated_at: string;
    sections_count: number;
    active_scenario: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.generateReport();
      setReportData(res);
    } catch (err: any) {
      alert('Failed to load report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-relief-blue" />
              Emergency Logistics Report (16 Sections)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive humanitarian decision-support audit aligned with UN SDGs 2, 3, and 11
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>

            {/* Direct Backend ReportLab PDF Download */}
            <a
              href={apiClient.getReportPdfUrl()}
              download
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-relief-blue hover:bg-relief-blueDark rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download Formal PDF
            </a>
          </div>
        </div>

        {/* CSV Export Links */}
        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Quick Data Exports:</span>
          <a
            href={apiClient.getAllocationsCsvUrl()}
            download
            className="text-relief-blue hover:underline font-medium inline-flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3 h-3" /> Allocations CSV
          </a>
          <span className="text-slate-300">&bull;</span>
          <a
            href={apiClient.getDeliveriesCsvUrl()}
            download
            className="text-relief-blue hover:underline font-medium inline-flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3 h-3" /> Delivery Plan CSV
          </a>
          <span className="text-slate-300">&bull;</span>
          <a
            href={apiClient.getScenarioComparisonCsvUrl()}
            download
            className="text-relief-blue hover:underline font-medium inline-flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3 h-3" /> Scenario Deltas CSV
          </a>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-relief-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-sm">Compiling 16-Section Emergency Logistics Report...</h4>
          <p className="text-xs text-slate-500 mt-1">Extracting live mathematical optimization, route schedules, and fairness audit records.</p>
        </div>
      )}

      {/* Rendered Document */}
      {reportData && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 shadow-sm prose prose-slate max-w-none">
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-relief-orange">
                ReliefRoute Decision-Support Dossier
              </span>
              <span className="text-xs font-mono text-slate-400">
                Generated: {new Date(reportData.generated_at).toUTCString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
              Emergency Logistics & Disaster Supply Allocation Report
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Provincia de Esperanza Disaster Response Sector &bull; CEP 8 Complex Engineering Project &bull; Active Scenario: {reportData.active_scenario}
            </p>
          </div>

          {/* Formatted Markdown Rendering with Custom Styled Sections */}
          <div className="space-y-6 text-xs text-slate-700 leading-relaxed font-sans">
            {reportData.markdown.split('\n---\n').map((section, idx) => (
              <div key={idx} className="print-break-inside-avoid border-b border-slate-100 pb-5">
                <div
                  className="space-y-2 prose-headings:font-bold prose-h2:text-base prose-h2:text-slate-900 prose-h3:text-sm prose-p:text-xs prose-table:text-xs prose-th:bg-slate-50 prose-th:p-2 prose-td:p-2 prose-td:border-b"
                  dangerouslySetInnerHTML={{
                    __html: section
                      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-slate-900 mb-2">$1</h1>')
                      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-slate-900 mt-4 mb-1 border-l-4 border-relief-blue pl-2">$1</h2>')
                      .replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-slate-800 mt-2 mb-1">$1</h3>')
                      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-slate-900">$1</strong>')
                      .replace(/\*(.*?)\*/gim, '<em class="italic text-slate-600">$1</em>')
                      .replace(/\n\n/gim, '<br/><br/>')
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
            ReliefRoute Decision Support System &bull; CEP 8: Disaster Relief Supply Allocation and Logistics &bull;
            SDG 2 Zero Hunger &bull; SDG 3 Good Health &bull; SDG 11 Sustainable Communities
          </div>
        </div>
      )}
    </div>
  );
};
