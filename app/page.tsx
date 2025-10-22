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
                  onClick={() => router.push(`/chat/${website.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white line-clamp-1">
                      {website.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
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
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
                  >
                    {website.url}
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Added {new Date(website.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
