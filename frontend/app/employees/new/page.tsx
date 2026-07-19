"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { ApiError, apiJson, buildQuery, ROLES, STATUSES, type Employee, type EmployeeListResponse, type Role, type Status } from "@/lib/ems";

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
  password: string;
  managerId: string;
  profileImage: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  salary: "",
  joiningDate: "",
  status: "ACTIVE",
  role: "EMPLOYEE",
  password: "",
  managerId: "",
  profileImage: "",
};

const emptyErrors: Record<string, string> = {};

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(emptyErrors);

  useEffect(() => {
    let active = true;

    const loadManagers = async () => {
      try {
        const response = await apiJson<EmployeeListResponse>(
          `/api/employees${buildQuery({ limit: 100, sortBy: "name" })}`,
        );

        if (active) {
          setManagers(response.data);
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
  }, []);

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
    setSubmitting(true);
    setError(null);
    setFieldErrors(emptyErrors);

    try {
      await apiJson<Employee>("/api/employees", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          salary: Number(form.salary),
          managerId: form.managerId || null,
          profileImage: form.profileImage || null,
        }),
      });

      router.push("/employees");
    } catch (submitError) {
      if (submitError instanceof ApiError) {
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
        setError(submitError instanceof Error ? submitError.message : "Failed to create employee");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["SUPER_ADMIN", "HR"]} redirectTo="/employees">
      <AppShell title="New employee" subtitle="Create a new employee record and assign a manager.">
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
          {([
            ["name", "Name"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["department", "Department"],
            ["designation", "Designation"],
            ["salary", "Salary"],
            ["joiningDate", "Joining date"],
            ["password", "Password"],
            ["profileImage", "Profile image URL"],
          ] as const).map(([key, label]) => (
            <label key={key} className="space-y-2 lg:col-span-1">
              <span className="text-sm text-slate-300">{label}</span>
              <input
                value={form[key]}
                onChange={(event) => updateField(key, event.target.value)}
                type={key === "email" ? "email" : key === "password" ? "password" : key === "salary" ? "number" : key === "joiningDate" ? "date" : "text"}
                step={key === "salary" ? "0.01" : undefined}
                required={key !== "profileImage"}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
              {fieldErrors[key] ? <p className="text-sm text-rose-200">{fieldErrors[key]}</p> : null}
            </label>
          ))}

          <label className="space-y-2 lg:col-span-1">
            <span className="text-sm text-slate-300">Status</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value as Status)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
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
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

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
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 lg:col-span-2">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 lg:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create employee"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/employees")}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </AppShell>
    </ProtectedRoute>
  );
}
