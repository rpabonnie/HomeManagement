/**
 * HMS Web Application
 * Household Management System - Frontend
 */

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Household Management System
          </h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Budget Planner</h2>
            <p className="text-gray-600">
              Track expenses, manage subscriptions, and plan your budget.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Generator Log</h2>
            <p className="text-gray-600">
              Track runtime hours and maintenance schedules.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
