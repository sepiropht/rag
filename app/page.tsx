'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Website {
  id: string;
  title: string;
  description: string | null;
  url: string;
  status: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWebsites, setLoadingWebsites] = useState(true);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      const res = await fetch('/api/websites');
      if (res.ok) {
        const data = await res.json();
        setWebsites(data);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoadingWebsites(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        const website = await res.json();
        setUrl('');
        fetchWebsites(); // Refresh list
        // Optionally redirect to chat
        // router.push(`/chat/${website.id}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to process website');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchWebsites(); // Refresh list
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete website');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800 dark:text-white">
          RAG Open Source
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          Chat with any website using AI-powered RAG
        </p>

        {/* URL Input */}
        <form onSubmit={handleSubmit} className="mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter Website URL
            </label>
            <div className="flex gap-3">
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Processing...' : 'Add Website'}
              </button>
            </div>
          </div>
        </form>

        {/* Websites List */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
            Your Websites
          </h2>

          {loadingWebsites ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : websites.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No websites yet. Add one above to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {websites.map((website) => (
                <div
                  key={website.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow relative"
                >
                  <button
                    onClick={() => handleDelete(website.id, website.title)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete website"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                  <div className="flex items-start justify-between mb-2 pr-8">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white line-clamp-1">
                      {website.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                        website.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : website.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : website.status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {website.status}
                    </span>
                  </div>
                  {website.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {website.description}
                    </p>
                  )}
                  <a
                    href={website.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block mb-3"
                  >
                    {website.url}
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    Added {new Date(website.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => router.push(`/chat/${website.id}`)}
                    disabled={website.status !== 'completed'}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      website.status === 'completed'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {website.status === 'completed' ? 'Start Chat' : `Status: ${website.status}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
