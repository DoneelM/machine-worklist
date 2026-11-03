import { useQuery, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseSuspenseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
export class ApiError extends Error {
    status: number;
    statusText: string;
    body: unknown;
    constructor(status: number, statusText: string, body: unknown){
        super(`HTTP ${status}: ${statusText}`);
        this.name = "ApiError";
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}
export interface ActionIn {
    action: "claim" | "note" | "resolve" | "found_issue" | "false_alarm" | "reopen";
    note?: string | null;
}
export interface ActionState {
    note?: string | null;
    owner?: string | null;
    status?: "open" | "claimed" | "resolved";
    updated_at?: string | null;
}
export interface AskIn {
    conversation_id?: string | null;
    question: string;
}
export interface AskOut {
    conversation_id: string;
    error?: string | null;
    message_id: string;
    sql?: string | null;
    sql_title?: string | null;
    status: string;
    suggestions?: string[];
    table?: AskTable | null;
    text?: string | null;
}
export interface AskTable {
    columns: string[];
    rows: (string | null)[][];
    total_rows: number;
}
export interface ComplexValue {
    display?: string | null;
    primary?: boolean | null;
    ref?: string | null;
    type?: string | null;
    value?: string | null;
}
export interface DailyPoint {
    critical_defects: number;
    day: string;
    major_defects: number;
    minor_defects: number;
    temperature_c: number;
    units_planned: number;
    units_produced: number;
    vibration_mm_s: number;
}
export interface FiltersOut {
    machine_types: string[];
    plants: string[];
}
export interface HTTPValidationError {
    detail?: ValidationError[];
}
export interface LogEntry {
    action: string;
    actor: string | null;
    created_at: string;
    note: string | null;
}
export interface MachineDetailOut {
    daily: DailyPoint[];
    history: LogEntry[];
    item: WorklistItem;
    temp_baseline: number;
    temp_recent: number;
    units_planned: number;
    units_produced: number;
    vib_baseline: number;
    vib_recent: number;
}
export interface ModelEvalOut {
    base_rate: number;
    crew_capacity: number;
    label: string;
    model_auc: number;
    model_precision_at_20: number;
    model_version: string;
    rule_auc: number;
    rule_precision_at_20: number;
    test_end: string;
    test_start: string;
    train_end: string;
}
export interface Name {
    family_name?: string | null;
    given_name?: string | null;
}
export interface RiskDriver {
    contribution: number;
    feature: string;
    label: string;
    percentile?: number | null;
    value: number | string;
}
export interface User {
    active?: boolean | null;
    display_name?: string | null;
    emails?: ComplexValue[] | null;
    entitlements?: ComplexValue[] | null;
    external_id?: string | null;
    groups?: ComplexValue[] | null;
    id?: string | null;
    name?: Name | null;
    roles?: ComplexValue[] | null;
    schemas?: UserSchema[] | null;
    user_name?: string | null;
}
export const UserSchema = {
    "urn:ietf:params:scim:schemas:core:2.0:User": "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:workspace:2.0:User": "urn:ietf:params:scim:schemas:extension:workspace:2.0:User"
} as const;
export type UserSchema = typeof UserSchema[keyof typeof UserSchema];
export interface ValidationError {
    ctx?: Record<string, unknown>;
    input?: unknown;
    loc: (string | number)[];
    msg: string;
    type: string;
}
export interface VersionOut {
    version: string;
}
export interface WorklistItem {
    action: ActionState;
    attention_score: number;
    critical_defects: number;
    defects_per_1k: number;
    drivers?: RiskDriver[];
    line: string;
    machine_id: string;
    machine_type: string;
    plant: string;
    risk_7d?: number | null;
    risk_lift?: number | null;
    risk_rank?: number | null;
    serious_defects: number;
    temp_change: number;
    top_driver: "vibration" | "temperature" | "defects" | "yield";
    vib_trend: number;
    yield_shortfall: number;
}
export interface WorklistOut {
    actions_enabled: boolean;
    as_of: string;
    items: WorklistItem[];
    risk_scored_for?: string | null;
}
export interface AskDataParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const askData = async (data: AskIn, params?: AskDataParams, options?: RequestInit): Promise<{
    data: AskOut;
}> =>{
    const res = await fetch("/api/ask", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useAskData(options?: {
    mutation?: UseMutationOptions<{
        data: AskOut;
    }, ApiError, {
        params: AskDataParams;
        data: AskIn;
    }>;
}) {
    return useMutation({
        mutationFn: (vars)=>askData(vars.data, vars.params),
        ...options?.mutation
    });
}
export interface CurrentUserParams {
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const currentUser = async (params?: CurrentUserParams, options?: RequestInit): Promise<{
    data: User;
}> =>{
    const res = await fetch("/api/current-user", {
        ...options,
        method: "GET",
        headers: {
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        }
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const currentUserKey = (params?: CurrentUserParams)=>{
    return [
        "/api/current-user",
        params
    ] as const;
};
export function useCurrentUser<TData = {
    data: User;
}>(options?: {
    params?: CurrentUserParams;
    query?: Omit<UseQueryOptions<{
        data: User;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: currentUserKey(options?.params),
        queryFn: ()=>currentUser(options?.params),
        ...options?.query
    });
}
export function useCurrentUserSuspense<TData = {
    data: User;
}>(options?: {
    params?: CurrentUserParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: User;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: currentUserKey(options?.params),
        queryFn: ()=>currentUser(options?.params),
        ...options?.query
    });
}
export const getFilters = async (options?: RequestInit): Promise<{
    data: FiltersOut;
}> =>{
    const res = await fetch("/api/filters", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getFiltersKey = ()=>{
    return [
        "/api/filters"
    ] as const;
};
export function useGetFilters<TData = {
    data: FiltersOut;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: FiltersOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getFiltersKey(),
        queryFn: ()=>getFilters(),
        ...options?.query
    });
}
export function useGetFiltersSuspense<TData = {
    data: FiltersOut;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: FiltersOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getFiltersKey(),
        queryFn: ()=>getFilters(),
        ...options?.query
    });
}
export interface GetMachineParams {
    machine_id: string;
}
export const getMachine = async (params: GetMachineParams, options?: RequestInit): Promise<{
    data: MachineDetailOut;
}> =>{
    const res = await fetch(`/api/machines/${params.machine_id}`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getMachineKey = (params?: GetMachineParams)=>{
    return [
        "/api/machines/{machine_id}",
        params
    ] as const;
};
export function useGetMachine<TData = {
    data: MachineDetailOut;
}>(options: {
    params: GetMachineParams;
    query?: Omit<UseQueryOptions<{
        data: MachineDetailOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getMachineKey(options.params),
        queryFn: ()=>getMachine(options.params),
        ...options?.query
    });
}
export function useGetMachineSuspense<TData = {
    data: MachineDetailOut;
}>(options: {
    params: GetMachineParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: MachineDetailOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getMachineKey(options.params),
        queryFn: ()=>getMachine(options.params),
        ...options?.query
    });
}
export interface ApplyActionParams {
    machine_id: string;
    "X-Forwarded-Host"?: string | null;
    "X-Forwarded-Preferred-Username"?: string | null;
    "X-Forwarded-User"?: string | null;
    "X-Forwarded-Email"?: string | null;
    "X-Request-Id"?: string | null;
    "X-Forwarded-Access-Token"?: string | null;
}
export const applyAction = async (params: ApplyActionParams, data: ActionIn, options?: RequestInit): Promise<{
    data: ActionState;
}> =>{
    const res = await fetch(`/api/machines/${params.machine_id}/actions`, {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(params?.["X-Forwarded-Host"] != null && {
                "X-Forwarded-Host": params["X-Forwarded-Host"]
            }),
            ...(params?.["X-Forwarded-Preferred-Username"] != null && {
                "X-Forwarded-Preferred-Username": params["X-Forwarded-Preferred-Username"]
            }),
            ...(params?.["X-Forwarded-User"] != null && {
                "X-Forwarded-User": params["X-Forwarded-User"]
            }),
            ...(params?.["X-Forwarded-Email"] != null && {
                "X-Forwarded-Email": params["X-Forwarded-Email"]
            }),
            ...(params?.["X-Request-Id"] != null && {
                "X-Request-Id": params["X-Request-Id"]
            }),
            ...(params?.["X-Forwarded-Access-Token"] != null && {
                "X-Forwarded-Access-Token": params["X-Forwarded-Access-Token"]
            }),
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useApplyAction(options?: {
    mutation?: UseMutationOptions<{
        data: ActionState;
    }, ApiError, {
        params: ApplyActionParams;
        data: ActionIn;
    }>;
}) {
    return useMutation({
        mutationFn: (vars)=>applyAction(vars.params, vars.data),
        ...options?.mutation
    });
}
export const getModelEval = async (options?: RequestInit): Promise<{
    data: ModelEvalOut | null;
}> =>{
    const res = await fetch("/api/model-eval", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getModelEvalKey = ()=>{
    return [
        "/api/model-eval"
    ] as const;
};
export function useGetModelEval<TData = {
    data: ModelEvalOut | null;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: ModelEvalOut | null;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getModelEvalKey(),
        queryFn: ()=>getModelEval(),
        ...options?.query
    });
}
export function useGetModelEvalSuspense<TData = {
    data: ModelEvalOut | null;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: ModelEvalOut | null;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getModelEvalKey(),
        queryFn: ()=>getModelEval(),
        ...options?.query
    });
}
export const version = async (options?: RequestInit): Promise<{
    data: VersionOut;
}> =>{
    const res = await fetch("/api/version", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const versionKey = ()=>{
    return [
        "/api/version"
    ] as const;
};
export function useVersion<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
export function useVersionSuspense<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
export interface GetWorklistParams {
    plant?: string;
    machine_type?: string;
    sort?: "score" | "risk";
}
export const getWorklist = async (params?: GetWorklistParams, options?: RequestInit): Promise<{
    data: WorklistOut;
}> =>{
    const searchParams = new URLSearchParams();
    if (params?.plant != null) searchParams.set("plant", String(params?.plant));
    if (params?.machine_type != null) searchParams.set("machine_type", String(params?.machine_type));
    if (params?.sort != null) searchParams.set("sort", String(params?.sort));
    const queryString = searchParams.toString();
    const url = queryString ? `/api/worklist?${queryString}` : "/api/worklist";
    const res = await fetch(url, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const getWorklistKey = (params?: GetWorklistParams)=>{
    return [
        "/api/worklist",
        params
    ] as const;
};
export function useGetWorklist<TData = {
    data: WorklistOut;
}>(options?: {
    params?: GetWorklistParams;
    query?: Omit<UseQueryOptions<{
        data: WorklistOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: getWorklistKey(options?.params),
        queryFn: ()=>getWorklist(options?.params),
        ...options?.query
    });
}
export function useGetWorklistSuspense<TData = {
    data: WorklistOut;
}>(options?: {
    params?: GetWorklistParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: WorklistOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: getWorklistKey(options?.params),
        queryFn: ()=>getWorklist(options?.params),
        ...options?.query
    });
}
