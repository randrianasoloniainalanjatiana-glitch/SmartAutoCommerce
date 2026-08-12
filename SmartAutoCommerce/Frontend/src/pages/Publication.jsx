import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DJANGO_API } from "../config/apiConfig";
import { useAuth } from "../contexts/AuthContext";

const DAY_LABELS = {
  Monday: "Lundi",
  Tuesday: "Mardi",
  Wednesday: "Mercredi",
  Thursday: "Jeudi",
  Friday: "Vendredi",
  Saturday: "Samedi",
  Sunday: "Dimanche",
};

function shortText(text, max = 120) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}...`;
}

export default function Publication() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${DJANGO_API}/publications/${user.id}/dashboard/`);
      setData(res.data || null);
    } catch (e) {
      console.error("Erreur publications:", e);
      setError("Impossible de charger les publications.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const bestHours = useMemo(() => {
    const source = data?.distribution_by_hour || {};
    return Object.entries(source)
      .map(([hour, count]) => ({ hour: Number(hour), count: Number(count || 0) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [data]);

  const bestDays = useMemo(() => {
    const source = data?.distribution_by_day || {};
    return Object.entries(source)
      .map(([day, count]) => ({ day, count: Number(count || 0) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [data]);

  const posts = data?.posts || [];
  const maxEngagement = Math.max(1, ...posts.map((p) => p.engagement || 0));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suivi des publications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Performances, engagement, repartition des publications et alertes.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-colors"
        >
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs uppercase font-bold text-gray-500">Total publications</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{data?.total_posts || 0}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs uppercase font-bold text-gray-500">Engagement moyen</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {data?.average_engagement ?? 0}
            <span className="text-xl">%</span>
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs uppercase font-bold text-gray-500">Meilleure publication</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 mt-2">
            {data?.best_post ? shortText(data.best_post.message, 90) : "Aucune publication"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Analyse temporelle</h2>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Jours les plus utilises</p>
              {bestDays.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune donnée.</p>
              ) : (
                bestDays.map((d) => (
                  <div key={d.day} className="text-sm text-gray-700 dark:text-gray-300">
                    {DAY_LABELS[d.day] || d.day}: <span className="font-semibold">{d.count} posts</span>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Heures les plus utilisees</p>
              {bestHours.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune donnée.</p>
              ) : (
                bestHours.map((h) => (
                  <div key={h.hour} className="text-sm text-gray-700 dark:text-gray-300">
                    {String(h.hour).padStart(2, "0")}h:00 - <span className="font-semibold">{h.count} posts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Publications les plus performantes</h2>
          <div className="mt-4 space-y-3">
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{shortText(post.message, 50)}</p>
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {post.engagement}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${Math.max(4, ((post.engagement || 0) / maxEngagement) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {posts.length === 0 && <p className="text-sm text-gray-500">Aucune publication trouvée.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Historique des publications</h2>
        <p className="text-xs text-gray-500 mt-1">
          Score d'engagement = reactions_count + comments_count. L'engagement moyen est exprimé en % (échelle 0-100) par rapport à la publication la plus performante.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4">Publication</th>
                <th className="py-2 pr-4">Réactions</th>
                <th className="py-2 pr-4">Commentaires</th>
                <th className="py-2 pr-4">Engagement</th>
                <th className="py-2 pr-4">Alerte</th>
                <th className="py-2">Lien</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-gray-100 dark:border-gray-700/60">
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{shortText(post.message, 90)}</td>
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{post.reactions_count}</td>
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{post.comments_count}</td>
                  <td className="py-3 pr-4 font-semibold text-cyan-600 dark:text-cyan-400">{post.engagement}</td>
                  <td className="py-3 pr-4">
                    {post.has_sudden_spike ? (
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                        Hausse détectée
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3">
                    {post.permalink_url ? (
                      <a
                        href={post.permalink_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        Ouvrir
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Aucune publication disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
