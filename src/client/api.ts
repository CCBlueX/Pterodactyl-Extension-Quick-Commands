import { http } from '@pterodactyl/sdk';

export type Color = 'grey' | 'primary' | 'green' | 'orange' | 'red' | 'cyan' | 'yellow' | 'contrast';

export interface QuickButton {
    id: number;
    label: string;
    color: Color;
    icon: string | null;
    commands: string[];
    placeholders: string[];
    confirm: boolean;
    sort: number;
    eggs: number[] | null;
    global: boolean;
}

export interface ButtonInput {
    label: string;
    color: Color;
    icon: string | null;
    commands: string[];
    confirm: boolean;
    eggs?: number[] | null;
}

export interface ServerButtons {
    buttons: QuickButton[];
    can_manage: boolean;
}

export interface AdminButtons {
    buttons: QuickButton[];
    eggs: { id: number; name: string }[];
}

const server = (id: string) => `/api/client/servers/${id}/extensions/quick-commands`;
const admin = '/api/admin/extensions/quick-commands';

export const keys = {
    server: (id: string) => ['quick-commands', 'server', id] as const,
    admin: ['quick-commands', 'admin'] as const,
};

export const getButtons = async (id: string) => (await http.get<ServerButtons>(server(id))).data;
export const saveButton = async (id: string, input: ButtonInput, buttonId?: number) =>
    (buttonId ? await http.put<ServerButtons>(`${server(id)}/buttons/${buttonId}`, input) : await http.post<ServerButtons>(`${server(id)}/buttons`, input)).data;
export const deleteButton = async (id: string, buttonId: number) => (await http.delete<ServerButtons>(`${server(id)}/buttons/${buttonId}`)).data;
export const orderButtons = async (id: string, ids: number[]) => (await http.put<ServerButtons>(`${server(id)}/buttons/order`, { ids })).data;
export const runButton = async (id: string, buttonId: number, values: Record<string, string>) => (await http.post<{ sent: number }>(`${server(id)}/buttons/${buttonId}/run`, { values })).data;

export const getAdminButtons = async () => (await http.get<AdminButtons>(admin)).data;
export const saveAdminButton = async (input: ButtonInput, buttonId?: number) =>
    (buttonId ? await http.put<AdminButtons>(`${admin}/buttons/${buttonId}`, input) : await http.post<AdminButtons>(`${admin}/buttons`, input)).data;
export const deleteAdminButton = async (buttonId: number) => (await http.delete<AdminButtons>(`${admin}/buttons/${buttonId}`)).data;
export const orderAdminButtons = async (ids: number[]) => (await http.put<AdminButtons>(`${admin}/buttons/order`, { ids })).data;
