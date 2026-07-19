"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import {
  ApiError,
  apiJson,
  buildQuery,
  ROLES,
  STATUSES,
  type Employee,
  type EmployeeListResponse,
  type Role,
  type Status,
} from "@/lib/ems";
import { useAuth } from "@/app/context/auth-context";

type FormState = {
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  salary: string;
  joiningDate: string;
  status: Status;
  role: Role;
  managerId: string;
  profileImage: string;
};

const initialForm = (employee?: Employee | null): FormState => ({
  name: employee?.name ?? "",
  email: employee?.email ?? "",
  phone: employee?.phone ?? "",
  department: employee?.department ?? "",
  designation: employee?.designation ?? "",
  salary: employee ? String(employee.salary) : "",
  joiningDate: employee?.joiningDate ? employee.joiningDate.slice(0, 10) : "",
  status: employee?.status ?? "ACTIVE",
  role: employee?.role ?? "EMPLOYEE",
  managerId: employee?.managerId ?? "",
  profileImage: employee?.profileImage ?? "",
});

export default function EmployeeProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const id = params.id;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(initialForm());
  const canEditAll = user?.role === "SUPER_ADMIN" || user?.role === "HR";
  const isOwnProfile = user?.id === employee?.id;
  const canEditSelf = user?.role === "EMPLOYEE" && isOwnProfile;
  const canEdit = canEditAll || canEditSelf;

  useEffect(() => {
    let active = true;

    const loadEmployee = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiJson<Employee>(`/api/employees/${id}`);

        if (!active) {
          return;
        }

        setEmployee(response);
        setForm(initialForm(response));
      } catch (loadError) {
        if (active) {
          setEmployee(null);
          setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadEmployee();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    const loadManagers = async () => {
      if (!canEditAll) {
        return;
      }

      try {
        const response = await apiJson<EmployeeListResponse>(
          `/api/employees${buildQuery({ limit: 100, sortBy: "name" })}`,
        );

        if (active) {
          setManagers(response.data.filter((manager) => manager.id !== id));
        }
      } catch {
        if (active) {
          setManagers([]);
        }
      }
    };

    void loadManagers();

    return () => {
      active = false;
    };
  }, [canEditAll, id]);

  const fields = useMemo(
    () => [
      ["name", "Name"],
      ["email", "Email"],
      ["phone", "Phone"],
      ["department", "Department"],
      ["designation", "Designation"],
      ["salary", "Salary"],
      ["joiningDate", "Joining date"],
      ["profileImage", "Profile image URL"],
    ] as const,
    [],
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employee) {
      return;
    }

    setSaving(true);
    setError(null);
    setManagerError(null);
    setFieldErrors({});

    try {
      const payload: Partial<Employee> & { managerId?: string | null } = canEditAll
        ? {
            name: form.name,
            email: form.email,
            phone: form.phone,
            department: form.department,
            designation: form.designation,
            salary: Number(form.salary),
            joiningDate: form.joiningDate,
            status: form.status,
            role: form.role,
            profileImage: form.profileImage || null,
            managerId: employee.managerId,
          }
        : {
            phone: form.phone,
            profileImage: form.profileImage || null,
          };

      await apiJson<Employee>(`/api/employees/${employee.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (canEditAll && form.managerId !== (employee.managerId ?? "")) {
        await apiJson<Employee>(`/api/employees/${employee.id}/manager`, {
          method: "PATCH",
          body: JSON.stringify({ managerId: form.managerId }),
        });
      }

      router.refresh();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        if (submitError.status === 400 && submitError.message === "Circular reporting not allowed") {
          setManagerError(submitError.message);
          return;
        }

        setError(submitError.message);
        const payload = submitError.payload as { errors?: Record<string, string[]> } | null;
        if (payload?.errors) {
          const nextErrors: Record<string, string> = {};
          for (const [key, value] of Object.entries(payload.errors)) {
            nextErrors[key] = value?.[0] ?? "Invalid value";
          }
          setFieldErrors(nextErrors);
        }
      } else {
        setError(submitError instanceof Error ? submitError.message : "Failed to update employee");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Employee profile" subtitle="Loading employee details...">
          <p className="text-sm text-slate-400">Loading...</p>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title={employee ? employee.name : "Employee profile"}
        subtitle={employee ? employee.email : undefined}
      >
        {error ? (
          <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {employee ? (
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <span className="block text-slate-500">Role</span>
                  {employee.role}
                </p>
                <p>
                  <span className="block text-slate-500">Status</span>
                  {employee.status}
                </p>
                <p>
                  <span className="block text-slate-500">Department</span>
                  {employee.department}
                </p>
                <p>
                  <span className="block text-slate-500">Manager ID</span>
                  {employee.managerId ?? "None"}
                </p>
              </div>
            </div>

            {fields.map(([key, label]) => {
              const readOnly = !canEdit || (key !== "phone" && key !== "profileImage" && !canEditAll);

              return (
                <label key={key} className="space-y-2 lg:col-span-1">
                  <span className="text-sm text-slate-300">{label}</span>
                  <input
                    value={form[key]}
                    onChange={(event) => updateField(key, event.target.value)}
                    type={key === "email" ? "email" : key === "salary" ? "number" : key === "joiningDate" ? "date" : "text"}
                    step={key === "salary" ? "0.01" : undefined}
                    readOnly={readOnly}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 read-only:cursor-not-allowed read-only:bg-slate-900/70 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  {fieldErrors[key] ? <p className="text-sm text-rose-200">{fieldErrors[key]}</p> : null}
                </label>
              );
            })}

            <label className="space-y-2 lg:col-span-1">
              <span className="text-sm text-slate-300">Status</span>
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as Status)}
                disabled={!canEditAll}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 lg:col-span-1">
              <span className="text-sm text-slate-300">Role</span>
              <select
                value={form.role}
                onChange={(event) => updateField("role", event.target.value as Role)}
                disabled={!canEditAll}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            {canEditAll ? (
              <label className="space-y-2 lg:col-span-2">
                <span className="text-sm text-slate-300">Manager</span>
                <select
                  value={form.managerId}
                  onChange={(event) => updateField("managerId", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                >
                  <option value="">No manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.department})
                    </option>
                  ))}
                </select>
                {managerError ? <p className="text-sm text-rose-200">{managerError}</p> : null}
              </label>
            ) : null}

            {canEdit ? (
              <div className="flex gap-3 lg:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/employees")}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Back
                </button>
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 lg:col-span-2">
                This profile is read-only for your role.
              </p>
            )}
          </form>
        ) : null}
      </AppShell>
    </ProtectedRoute>
  );
}
