"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import api, { endpoints } from "../../../../lib/api";
import { fetchModel as fetchModelApi, fetchLogs, rollbackVersion, downloadModel as downloadModelApi } from "../../../../lib/models";
import { useToast } from "../../../../components/ToastProvider";

export default function ModelDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [model, setModel] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const { addToast } = useToast();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchModel = async () => {
    try {
      setInitialLoading(true);
      const data = await fetchModelApi(id);
      setModel(data);

      // warn if multiple active versions
      const activeCount = (data.versions || []).filter((v) => v.is_active).length;
      if (activeCount > 1) addToast("Warning: multiple active versions detected for this model", "error");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch model";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setActivityLogsLoading(true);
      const res = await fetchLogs(id);
      setActivityLogs(res.data || res || []);
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
      addToast("Failed to load activity logs", "error");
      setActivityLogs([]);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    // Set user data (you might want to fetch this from your API)
    setUser({ name: "User", email: "user@example.com" });
    fetchModel();
  }, [id, router, token]);

 const handleDownload = async () => {
  try {
    const res = await downloadModelApi(id);

    // Create a blob link to trigger the browser download
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;

    // Optional: backend can send filename in headers
    const contentDisposition = res.headers["content-disposition"];
    let filename = "downloaded_file";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("File download failed:", error);
    addToast("File download failed", "error");
  }
};


  const handleRollback = async (versionId) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await rollbackVersion(id, versionId);
      addToast(res.message || "Rollback successful", "success");
      await fetchModel(); // refresh model data to reflect new active version
    } catch (err) {
      const msg = err.response?.data?.message || "Rollback failed";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewActivityLogs = async () => {
    setShowActivityLogs(true);
    await fetchActivityLogs();
  };

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      if (isNaN(date)) return "Invalid date";
      return date.toLocaleString("en-IN", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: "Asia/Kolkata"
      });
    } catch {
      return "Invalid date";
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'upload':
        return 'bg-blue-100 text-blue-800';
      case 'new-version':
        return 'bg-green-100 text-green-800';
      case 'rollback':
        return 'bg-yellow-100 text-yellow-800';
      case 'download':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header user={user} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header user={user} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading model details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Dashboard</span>
        </button>

        {/* Model Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">ML</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{model.name}</h1>
                </div>
              </div>
              
              <p className="text-gray-600 text-lg mb-4">{model.name}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span><strong>Upload Date:</strong> {formatDate(model.created_at)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong>Status:</strong> <span className="text-green-600 font-medium">Active</span></span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 lg:mt-0 flex space-x-3">
              <button
                onClick={handleViewActivityLogs}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>View Activity Log</span>
              </button>
              <button
                onClick={handleDownload}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Model</span>
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {message}
          </div>
        )}

        {loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Processing rollback...</span>
          </div>
        )}

        {/* Version History */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Version History</span>
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {model.versions?.map((version) => (
                  <tr key={version.id} className="hover:bg-gray-50 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">v{version.version}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(version.upload_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {version.is_active ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {version.is_active ? (
                        <button
                          onClick={() => handleRollback(version.model_id)}
                          disabled={loading}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <span>Rollback</span>
                        </button>
                      ) : (
                        <span className="text-gray-400">No actions available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!model.versions || model.versions.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No version history</h3>
              <p className="text-gray-500">This model doesn't have any previous versions yet.</p>
            </div>
          )}
        </div>
      </main>

      {/* Activity Logs Modal */}
      {showActivityLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">
                Activity Logs - {model.name}
              </h2>
              <button
                onClick={() => setShowActivityLogs(false)}
                className="text-gray-400 hover:text-gray-600 transition duration-150"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {activityLogsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading activity logs...</p>
                  </div>
                </div>
              ) : activityLogs.length > 0 ? (
                <div className="space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                              {log.action.replace('-', ' ')}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-800 font-medium mb-1">
                            {log.message}
                            {log.version_number && (
                              <span className="text-blue-600 ml-1">(v{log.version_number})</span>
                            )}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              <strong>User:</strong> {log.user_name}
                            </span>
                            <span>
                              <strong>Email:</strong> {log.user_email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activity logs found</h3>
                  <p className="text-gray-500">Activity will appear here as you use this model.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {activityLogs.length} activity log{activityLogs.length !== 1 ? 's' : ''} found
                </span>
                <button
                  onClick={() => setShowActivityLogs(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition duration-150 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Header Component for consistency
function Header({ user, onLogout }) {
  const router = useRouter();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">ModelHub</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => router.push("/models/upload")}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Upload Model</span>
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                Dashboard
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user.name}
                </span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}