import { apiFetch } from "@/lib/api";

export const ROLES = ["SUPER_ADMIN", "HR", "EMPLOYEE"] as const;
export const STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type Role = (typeof ROLES)[number];
export type Status = (typeof STATUSES)[number];

export type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  salary: number;
  joiningDate: string;
  status: Status;
  role: Role;
  managerId: string | null;
  profileImage: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeListResponse = {
  data: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DashboardStats = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departmentCount: number;
  departments: Array<{
    department: string;
    count: number;
  }>;
};

export type OrganizationNode = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: Role;
  status: Status;
  profileImage: string | null;
  children: OrganizationNode[];
};

export type ApiFieldErrors = Record<string, string[] | undefined>;

export type ApiErrorBody = {
  message?: string;
  errors?: ApiFieldErrors;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function readBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as ApiErrorBody).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function buildQuery(params: Record<string, string | number | undefined | null>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  const payload = await readBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, getMessage(payload, "Request failed"), payload);
  }

  return payload as T;
}

export async function apiVoid(path: string, init: RequestInit = {}) {
  const response = await apiFetch(path, init);
  const payload = await readBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, getMessage(payload, "Request failed"), payload);
  }

  return payload;
}
