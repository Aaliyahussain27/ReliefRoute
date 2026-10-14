import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { AllocationOptimizerPage } from './pages/AllocationOptimizerPage';
import { DeliveryRoutesPage } from './pages/DeliveryRoutesPage';
import { DemandForecastPage } from './pages/DemandForecastPage';
import { EmergencyReportPage } from './pages/EmergencyReportPage';
import { OverviewPage } from './pages/OverviewPage';
import { ReliefCentersPage } from './pages/ReliefCentersPage';
import { ScenarioSimulatorPage } from './pages/ScenarioSimulatorPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { apiClient } from './api/client';
import type {
  DashboardOverview,
  DeliveryPlanResponse,
  OptimizationResult,
  ReliefCenter,
  RoadSegment,
  Warehouse,
} from './types';

const tabDetails: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Operations Overview',
    subtitle: 'Relief distribution status and regional needs',
  },
  'relief-centers': {
    title: 'Relief Centers',
    subtitle: 'Manage affected communities and their needs',
  },
  warehouses: {
    title: 'Warehouses & Inventory',
    subtitle: 'Available supplies and dispatch capacity',
  },
  demand: {
    title: 'Demand Forecast',
    subtitle: 'Estimate food, water, and medical requirements',
  },
  optimizer: {
    title: 'Allocation Optimizer',
    subtitle: 'Review fair, urgency-aware supply recommendations',
  },
  routes: {
    title: 'Delivery Routes',
    subtitle: 'Plan dispatches around vehicle and road constraints',
  },
  scenarios: {
    title: 'Scenario Simulator',
    subtitle: 'Compare operational disruptions against the baseline',
  },
  report: {
    title: 'Emergency Report',
    subtitle: 'Generate and export the current logistics assessment',
  },
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [centers, setCenters] = useState<ReliefCenter[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [roadSegments, setRoadSegments] = useState<RoadSegment[]>([]);
  const [deliveryPlan, setDeliveryPlan] = useState<DeliveryPlanResponse | null>(null);
  const [activeScenarioName, setActiveScenarioName] = useState('Baseline: Normal Operations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async (knownOptimization?: OptimizationResult) => {
    setLoading(true);
    setError(null);

    try {
      const [nextCenters, nextWarehouses, nextRoadSegments] = await Promise.all([
        apiClient.getReliefCenters(),
        apiClient.getWarehouses(),
        apiClient.getRoadNetwork(),
      ]);

      setCenters(nextCenters);
      setWarehouses(nextWarehouses);
      setRoadSegments(nextRoadSegments);

      const nextOptimization = knownOptimization ?? await apiClient.runOptimization();
      const nextDeliveryPlan = await apiClient.planDeliveries(nextOptimization);
      setDeliveryPlan(nextDeliveryPlan);
      setOverview(await apiClient.getDashboard());
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const handleResetData = async () => {
    try {
      await apiClient.resetDataset();
      setActiveScenarioName('Baseline: Normal Operations');
      await refreshData();
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    }
  };

  const handleOptimizationComplete = (result: OptimizationResult) => {
    void refreshData(result);
  };

  const details = tabDetails[currentTab] ?? tabDetails.overview;
  const criticalAlertCount = overview?.alerts.filter((alert) => alert.severity === 'CRITICAL').length ?? 0;

  const renderPage = () => {
    switch (currentTab) {
      case 'relief-centers':
        return <ReliefCentersPage centers={centers} onRefresh={() => void refreshData()} />;
      case 'warehouses':
        return <WarehousesPage warehouses={warehouses} onRefresh={() => void refreshData()} />;
      case 'demand':
        return <DemandForecastPage onDemandUpdated={() => void refreshData()} />;
      case 'optimizer':
        return <AllocationOptimizerPage onOptimizationComplete={handleOptimizationComplete} />;
      case 'routes':
        return (
          <DeliveryRoutesPage
            deliveryPlan={deliveryPlan}
            centers={centers}
            warehouses={warehouses}
            roadSegments={roadSegments}
          />
        );
      case 'scenarios':
        return (
          <ScenarioSimulatorPage
            onScenarioApplied={(scenario) => setActiveScenarioName(scenario.scenario_name)}
          />
        );
      case 'report':
        return <EmergencyReportPage />;
      case 'overview':
      default:
        return (
          <OverviewPage
            overview={overview}
            centers={centers}
            warehouses={warehouses}
            roadSegments={roadSegments}
            deliveryTrips={deliveryPlan?.trips ?? []}
            loading={loading}
            onNavigate={setCurrentTab}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onResetData={() => void handleResetData()}
      />

      <div className={`min-h-screen transition-[margin] duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Navbar
          title={details.title}
          subtitle={details.subtitle}
          activeScenarioName={activeScenarioName}
          criticalAlertCount={criticalAlertCount}
        />

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {error && (
            <div
              className="mb-6 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Could not load the latest ReliefRoute data.</p>
                  <p className="mt-1 text-sm">{error}. Check that the FastAPI backend is running at http://localhost:8000.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refreshData()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-rose-100"
              >
                <RefreshCw className="h-4 w-4" />
                Retry connection
              </button>
            </div>
          )}

          {!loading && !error && !overview && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5" />
                <p className="font-semibold">The dashboard did not return any data. Try refreshing the application.</p>
              </div>
            </div>
          )}

          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
