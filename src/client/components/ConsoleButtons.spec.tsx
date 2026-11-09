import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createExtensionTestHost, createTestServer } from '@pterodactyl/sdk/testing';
import * as api from '../api';
import ConsoleButtons from './ConsoleButtons';

vi.mock('../api', async (importOriginal) => ({ ...(await importOriginal<typeof import('../api')>()), getButtons: vi.fn(), deleteButton: vi.fn(), orderButtons: vi.fn(), runButton: vi.fn().mockResolvedValue({ sent: 1 }) }));
const state = vi.hoisted(() => ({ current: 'running' }));
vi.mock('@pterodactyl/sdk', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@pterodactyl/sdk')>()),
    useServerResources: () => ({ data: state.current }),
    useServerWebsocketEvent: () => {},
}));

const button = (id: number, label: string, commands: string[], placeholders: string[] = [], global = true): api.QuickButton => ({ id, label, color: 'grey', icon: null, commands, placeholders, confirm: false, sort: 0, eggs: null, global });

afterEach(() => {
    cleanup();
    state.current = 'running';
    vi.mocked(api.runButton).mockClear();
});

test('sends plain buttons at once and asks for placeholder values first', async () => {
    vi.mocked(api.getButtons).mockResolvedValue({ buttons: [button(1, 'Save', ['save-all']), button(2, 'Kick', ['kick {player}'], ['player'])], can_manage: false });
    const server = createTestServer({ owner: false, permissions: ['control.console'] });
    const host = createExtensionTestHost({ extensionId: 'quick-commands', prefix: 'qcmd', server });
    render(<ConsoleButtons data={server} />, { wrapper: host.Wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.runButton).toHaveBeenCalledWith(server.attributes.identifier, 1, {}));

    fireEvent.click(screen.getByRole('button', { name: 'Kick' }));
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('player'), { target: { value: 'Steve' } });
    expect(screen.getByText('kick Steve')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    host.dispose();
});

test('moves the row directly below the console input', async () => {
    vi.mocked(api.getButtons).mockResolvedValue({ buttons: [button(1, 'Save', ['save-all'])], can_manage: false });
    const console = document.createElement('div');
    console.innerHTML = '<div id="input-row"><input aria-label="Console command input." /></div><div id="after"></div>';
    document.body.append(console);
    const server = createTestServer({ owner: false, permissions: ['control.console'] });
    const host = createExtensionTestHost({ extensionId: 'quick-commands', prefix: 'qcmd', server });
    render(<ConsoleButtons data={server} />, { wrapper: host.Wrapper });

    const save = await screen.findByRole('button', { name: 'Save' });
    expect(document.getElementById('input-row')!.nextElementSibling!.contains(save)).toBe(true);
    console.remove();
    host.dispose();
});

const mount = (buttons: api.QuickButton[], can_manage = false) => {
    vi.mocked(api.getButtons).mockResolvedValue({ buttons, can_manage });
    const server = createTestServer({ owner: true });
    const host = createExtensionTestHost({ extensionId: 'quick-commands', prefix: 'qcmd', server });
    render(<ConsoleButtons data={server} />, { wrapper: host.Wrapper });

    return { server, host };
};

test('disables the buttons while the server is offline', async () => {
    state.current = 'offline';
    const { host } = mount([button(1, 'Save', ['save-all'])]);

    expect(((await screen.findByRole('button', { name: 'Save' })) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Server offline')).toBeTruthy();
    host.dispose();
});

test('shows a search box from nine buttons and Enter runs the first match', async () => {
    const many = Array.from({ length: 9 }, (_, i) => button(i + 1, `Button ${i + 1}`, [`cmd${i + 1}`]));
    many[6] = button(7, 'Weather clear', ['weather clear']);
    many[7] = button(8, 'Weather rain', ['weather rain']);
    const { server, host } = mount(many);

    const search = await screen.findByLabelText('Search quick commands');
    fireEvent.change(search, { target: { value: 'weather' } });
    expect(screen.queryByRole('button', { name: 'Button 1' })).toBeNull();
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => expect(api.runButton).toHaveBeenCalledWith(server.attributes.identifier, 7, {}));
    expect(api.runButton).toHaveBeenCalledTimes(1);
    host.dispose();
});

test('hides the search box for eight buttons or fewer', async () => {
    const { host } = mount(Array.from({ length: 8 }, (_, i) => button(i + 1, `Button ${i + 1}`, ['say hi'])));

    await screen.findByRole('button', { name: 'Button 8' });
    expect(screen.queryByLabelText('Search quick commands')).toBeNull();
    host.dispose();
});

test('reorders own buttons from the manage dialog', async () => {
    vi.mocked(api.orderButtons).mockReturnValue(new Promise(() => {}));
    const { server, host } = mount([button(1, 'Global', ['say hi']), button(2, 'First', ['a'], [], false), button(3, 'Second', ['b'], [], false)], true);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.keyDown(screen.getByRole('listitem', { name: /^Second, position 2 of 2/ }), { key: 'ArrowUp', altKey: true });
    await waitFor(() => expect(api.orderButtons).toHaveBeenCalledWith(server.attributes.identifier, [3, 2]));
    expect(screen.getByRole('listitem', { name: /^Second, position 1 of 2/ })).toBeTruthy();
    host.dispose();
});

test('asks before deleting an own button', async () => {
    vi.mocked(api.deleteButton).mockResolvedValue({ buttons: [], can_manage: true });
    const { server, host } = mount([button(2, 'First', ['a'], [], false)], true);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(api.deleteButton).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteButton).toHaveBeenCalledWith(server.attributes.identifier, 2));
    host.dispose();
});

test('shows the load error with a retry', async () => {
    vi.mocked(api.getButtons).mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ buttons: [button(1, 'Save', ['save-all'])], can_manage: false });
    const server = createTestServer({ owner: true });
    const host = createExtensionTestHost({ extensionId: 'quick-commands', prefix: 'qcmd', server });
    render(<ConsoleButtons data={server} />, { wrapper: host.Wrapper });

    expect((await screen.findByRole('alert')).textContent).toMatch(/^Quick commands could not load/);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeTruthy();
    host.dispose();
});
