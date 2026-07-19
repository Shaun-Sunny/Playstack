"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import {
  apiJson,
  buildQuery,
  ROLES,
  STATUSES,
  type Employee,
  type EmployeeListResponse,
  type Role,
  type Status,
} from "@/lib/ems";

const PAGE_SIZE = 10;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<"" | Role>("");
  const [status, setStatus] = useState<"" | Status>("");
  const [sortBy, setSortBy] = useState<"name" | "joiningDate">("joiningDate");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    const loadEmployees = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiJson<EmployeeListResponse>(
          `/api/employees${buildQuery({
            search: search || undefined,
            department: department || undefined,
            role: role || undefined,
            status: status || undefined,
            sortBy,
            page,
            limit: PAGE_SIZE,
          })}`,
        );

        if (!active) {
          return;
        }

        setEmployees(response.data);
        setTotalPages(response.pagination.totalPages || 1);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load employees");
          setEmployees([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadEmployees();

    return () => {
      active = false;
    };
  }, [department, page, role, search, sortBy, status]);

  useEffect(() => {
    let active = true;

    const loadDepartments = async () => {
      try {
        const response = await apiJson<EmployeeListResponse>(
          `/api/employees${buildQuery({ limit: 100, sortBy: "name" })}`,
        );

        if (!active) {
          return;
        }

        const options = Array.from(
          new Set(response.data.map((employee) => employee.department).filter(Boolean)),
        );

        setDepartmentOptions(options);
      } catch {
        if (active) {
          setDepartmentOptions([]);
        }
      }
    };

    void loadDepartments();

    return () => {
      active = false;
    };
  }, []);

  return (
    <ProtectedRoute>
      <AppShell
        title="Employees"
        subtitle="Search, filter, and page through the employee directory."
      >
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/10 lg:flex-row lg:items-end">
          <label className="flex-1 space-y-2">
            <span className="text-sm text-slate-300">Search</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name or email"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
          </label>

          <label className="space-y-2 lg:w-44">
            <span className="text-sm text-slate-300">Department</span>
            <select
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="">All</option>
              {departmentOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 lg:w-36">
            <span className="text-sm text-slate-300">Role</span>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as "" | Role);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="">All</option>
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 lg:w-36">
            <span className="text-sm text-slate-300">Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "" | Status);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="">All</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setSortBy((current) => (current === "name" ? "joiningDate" : "name"))}
            className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
          >
            Sort: {sortBy === "name" ? "Name" : "Joining date"}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Department</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Joining date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/50 text-sm text-slate-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={5}>
                    Loading employees...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-6 text-rose-200" colSpan={5}>
                    {error}
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={5}>
                    No employees matched your filters.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="transition hover:bg-white/5">
                    <td className="px-4 py-4">
                      <Link href={`/employees/${employee.id}`} className="font-medium text-white hover:text-cyan-300">
                        <div>{employee.name}</div>
                        <div className="text-xs text-slate-400">{employee.email}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">{employee.department}</td>
                    <td className="px-4 py-4">{employee.role}</td>
                    <td className="px-4 py-4">{employee.status}</td>
                    <td className="px-4 py-4">
                      {new Date(employee.joiningDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
          <p>
            Page {page} of {Math.max(totalPages, 1)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
