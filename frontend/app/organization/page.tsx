"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { apiJson, type OrganizationNode } from "@/lib/ems";

function TreeNodeView({ node }: { node: OrganizationNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{node.name}</h3>
          <p className="text-sm text-slate-400">{node.designation}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">{node.role}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{node.status}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <p>{node.email}</p>
        <p>{node.phone}</p>
        <p>{node.department}</p>
        <p>{node.profileImage ? "Profile image set" : "No profile image"}</p>
      </div>

      {node.children.length > 0 ? (
        <div className="mt-4 space-y-4 border-l border-white/10 pl-4 sm:pl-6">
          {node.children.map((child) => (
            <TreeNodeView key={child.id} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function OrganizationPage() {
  const [tree, setTree] = useState<OrganizationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadTree = async () => {
      try {
        const response = await apiJson<OrganizationNode[]>("/api/organization/tree");

        if (active) {
          setTree(response);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load organization tree");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadTree();

    return () => {
      active = false;
    };
  }, []);

  return (
    <ProtectedRoute>
      <AppShell title="Organization" subtitle="A recursive view of reporting lines and teams.">
        {loading ? <p className="text-sm text-slate-400">Loading organization tree...</p> : null}
        {error ? (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <div className="space-y-4">
            {tree.map((node) => (
              <TreeNodeView key={node.id} node={node} />
            ))}
          </div>
        ) : null}
      </AppShell>
    </ProtectedRoute>
  );
}
