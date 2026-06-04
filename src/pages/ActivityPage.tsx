import { useGetIncidentStats, useListIncidents, getGetIncidentStatsQueryKey, getListIncidentsQueryKey } from '@/api-client';
import { getCategoryColor, getCategoryIcon } from "@/lib/categories";
import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityPage() {
  const { data: stats, isLoading: statsLoading } = useGetIncidentStats({
    query: { queryKey: getGetIncidentStatsQueryKey() },
  });
  const { data: incidents = [], isLoading: incidentsLoading } = useListIncidents(undefined, {
    query: { queryKey: getListIncidentsQueryKey() },
  });

  const recent = [...incidents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  const maxCat = stats?.byCategory?.reduce((a, b) => (b.count > a.count ? b : a), { category: "", count: 0 });

  return (
    <div className="flex flex-col h-full" data-testid="activity-page">
      <div className="flex-shrink-0 px-5 pt-12 pb-4" style={{ background: "rgba(13,13,18,0.95)" }}>
        <h1 className="text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
          Activity
        </h1>
        <p className="text-xs text-white/35 mt-0.5">City incident overview</p>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-5">
        {/* Stats cards */}
        {statsLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: stats?.total ?? 0, Icon: AlertTriangle, color: "#00b4ff" },
              { label: "Pending", value: stats?.pending ?? 0, Icon: Clock3, color: "#fb923c" },
              { label: "Verified", value: (stats?.verified ?? 0) + (stats?.resolved ?? 0), Icon: CheckCircle2, color: "#22c55e" },
            ].map(({ label, value, Icon, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-2xl p-3.5 flex flex-col items-center text-center"
                data-testid={`stat-${label.toLowerCase()}`}
              >
                <Icon size={18} style={{ color }} className="mb-1.5" />
                <span className="text-2xl font-extrabold text-white">{value}</span>
                <span className="text-[10px] text-white/40 mt-0.5 font-medium">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* By category */}
        {stats?.byCategory && stats.byCategory.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
              <TrendingUp size={14} style={{ color: "#00b4ff" }} />
              By Category
            </h3>
            <div className="space-y-2.5">
              {stats.byCategory
                .sort((a, b) => b.count - a.count)
                .map((item, i) => {
                  const color = getCategoryColor(item.category);
                  const icon = getCategoryIcon(item.category);
                  const pct = maxCat ? (item.count / maxCat.count) * 100 : 0;
                  return (
                    <motion.div
                      key={item.category}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="glass-card rounded-xl p-3 flex items-center gap-3"
                      data-testid={`category-stat-${item.category.toLowerCase()}`}
                    >
                      <span className="text-lg flex-shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white/80">{item.category}</span>
                          <span className="text-xs font-bold" style={{ color }}>{item.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.2 + i * 0.05 }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(to right, ${color}90, ${color})` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Recent timeline */}
        <div>
          <h3 className="text-sm font-bold text-white/70 mb-3">Recent Activity</h3>
          <div className="space-y-0">
            {incidentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-6">No activity yet</p>
            ) : (
              recent.map((inc, i) => {
                const color = getCategoryColor(inc.category);
                const icon = getCategoryIcon(inc.category);
                return (
                  <motion.div
                    key={inc.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 py-3"
                    data-testid={`timeline-item-${inc.id}`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                      >
                        {icon}
                      </div>
                      {i < recent.length - 1 && (
                        <div className="w-px flex-1 mt-1" style={{ background: "rgba(255,255,255,0.06)", minHeight: 16 }} />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white/85">{inc.customCategory ?? inc.category}</span>
                        <span className="text-[10px] text-white/30">{timeAgo(inc.timestamp)}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{inc.description}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
