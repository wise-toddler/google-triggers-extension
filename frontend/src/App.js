import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [authStatus, setAuthStatus] = useState(null);
  const [projects, setProjects] = useState([]);
  const [regions, setRegions] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('global');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [substitutions, setSubstitutions] = useState({});
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recentBuilds, setRecentBuilds] = useState([]);

  // Check authentication status
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load projects when authenticated
  useEffect(() => {
    if (authStatus?.authenticated) {
      loadProjects();
      loadRegions();
    }
  }, [authStatus]);

  // Load triggers when project or region changes
  useEffect(() => {
    if (selectedProject && selectedRegion) {
      loadTriggers();
    }
  }, [selectedProject, selectedRegion]);

  // Load recent builds when project changes
  useEffect(() => {
    if (selectedProject) {
      loadRecentBuilds();
    }
  }, [selectedProject]);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API}/auth/status`);
      setAuthStatus(response.data);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setAuthStatus({ authenticated: false });
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setMessage('Failed to load projects. Please check your authentication.');
    } finally {
      setLoading(false);
    }
  };

  const loadRegions = async () => {
    try {
      const response = await axios.get(`${API}/regions`);
      setRegions(response.data.regions);
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const loadTriggers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/triggers/${selectedProject}/${selectedRegion}`);
      setTriggers(response.data);
    } catch (error) {
      console.error('Failed to load triggers:', error);
      setMessage('Failed to load triggers. Please check your project permissions.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentBuilds = async () => {
    try {
      const response = await axios.get(`${API}/builds/recent/${selectedProject}`);
      setRecentBuilds(response.data);
    } catch (error) {
      console.error('Failed to load recent builds:', error);
    }
  };

  const executeTrigger = async () => {
    if (!selectedTrigger) {
      setMessage('Please select a trigger first');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API}/triggers/execute`, {
        project_id: selectedProject,
        region: selectedRegion,
        trigger_id: selectedTrigger,
        substitutions: substitutions,
        branch: branch
      });
      
      setMessage(`✅ ${response.data.message} (Build ID: ${response.data.build_id})`);
      
      // Refresh recent builds
      setTimeout(() => loadRecentBuilds(), 2000);
    } catch (error) {
      console.error('Failed to execute trigger:', error);
      setMessage(`❌ Failed to execute trigger: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addSubstitution = () => {
    const key = prompt('Enter substitution key (e.g., _ENVIRONMENT):');
    if (key) {
      const value = prompt('Enter substitution value:');
      if (value !== null) {
        setSubstitutions(prev => ({ ...prev, [key]: value }));
      }
    }
  };

  const removeSubstitution = (key) => {
    setSubstitutions(prev => {
      const newSubs = { ...prev };
      delete newSubs[key];
      return newSubs;
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600';
      case 'FAILURE': return 'text-red-600';
      case 'WORKING': return 'text-blue-600';
      case 'QUEUED': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (!authStatus) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!authStatus.authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-red-500 text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-300 mb-6">
            Please authenticate with Google Cloud to continue.
          </p>
          <div className="bg-gray-700 rounded p-4 text-left">
            <p className="text-sm text-gray-300 mb-2">Run this command in your terminal:</p>
            <code className="text-green-400 bg-gray-900 px-2 py-1 rounded text-sm">
              gcloud auth application-default login
            </code>
          </div>
          <button
            onClick={checkAuthStatus}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Google Cloud Build Extension</h1>
          <div className="flex items-center space-x-2">
            <span className="text-green-400">●</span>
            <span className="text-sm text-gray-300">{authStatus.account}</span>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Side Panel */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Region Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Region
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {regions.map(region => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Trigger Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trigger
              </label>
              <select
                value={selectedTrigger}
                onChange={(e) => setSelectedTrigger(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedProject}
              >
                <option value="">Select a trigger</option>
                {triggers.map(trigger => (
                  <option key={trigger.id} value={trigger.id}>
                    {trigger.name} {trigger.disabled ? '(Disabled)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="main"
              />
            </div>

            {/* Substitutions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Substitutions
                </label>
                <button
                  onClick={addSubstitution}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(substitutions).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs">
                      <span className="text-blue-400">{key}</span>
                      <span className="text-gray-300">=</span>
                      <span className="text-white">{value}</span>
                    </div>
                    <button
                      onClick={() => removeSubstitution(key)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={executeTrigger}
              disabled={!selectedTrigger || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
            >
              {loading ? 'Executing...' : 'Execute Trigger'}
            </button>

            {/* Message */}
            {message && (
              <div className="p-3 bg-gray-700 rounded text-sm">
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Recent Builds</h2>
            
            {selectedProject ? (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Build ID</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Created</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {recentBuilds.map(build => (
                        <tr key={build.id} className="hover:bg-gray-700">
                          <td className="p-4 text-sm font-mono text-gray-300">
                            {build.id.substring(0, 12)}...
                          </td>
                          <td className="p-4">
                            <span className={`text-sm font-medium ${getStatusColor(build.status)}`}>
                              {build.status}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-300">
                            {formatTime(build.create_time)}
                          </td>
                          <td className="p-4">
                            {build.log_url && (
                              <a
                                href={build.log_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                View Logs
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔧</div>
                <p className="text-gray-400">Select a project to view recent builds</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;