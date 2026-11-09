import { useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Input, Label, NamedIcon, httpErrorToHuman, toast, useServerResources, useServerWebsocketEvent, type SdkServer } from '@pterodactyl/sdk';
import { deleteButton, getButtons, keys, orderButtons, runButton, saveButton, type ButtonInput, type QuickButton, type ServerButtons } from '../api';
import ButtonDialog from './ButtonDialog';
import QuickChip from './QuickChip';
import SortableList from './SortableList';
import { useSpotBelowConsoleInput } from '../lib/consoleInput';

// More buttons than this get a search box.
const SEARCH_FROM = 9;

/** The button row below the console input, or above the console when there is no input. */
export default function ConsoleButtons({ data: server }: { data: SdkServer }) {
    const id = server.attributes.identifier;
    const queryClient = useQueryClient();
    const buttons = useQuery({ queryKey: keys.server(id), queryFn: () => getButtons(id), retry: false });
    const [asking, setAsking] = useState<QuickButton | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [managing, setManaging] = useState(false);
    const [editing, setEditing] = useState<QuickButton | 'new' | null>(null);
    const [removing, setRemoving] = useState<QuickButton | null>(null);
    const [search, setSearch] = useState('');
    const spot = useSpotBelowConsoleInput();
    const polled = useServerResources(server.attributes.uuid, (resources) => resources.attributes.current_state).data;
    const [live, setLive] = useState<string | null>(null);
    useServerWebsocketEvent('status', setLive);
    const offline = (live ?? polled) === 'offline';
    const onError = (error: unknown) => toast.error(httpErrorToHuman(error));
    const update = (result: ServerButtons) => queryClient.setQueryData(keys.server(id), result);

    const running = useMutation({
        mutationFn: ({ button, values }: { button: QuickButton; values: Record<string, string> }) => runButton(id, button.id, values),
        onSuccess: ({ sent }, { button }) => (setAsking(null), toast.success(`${button.label}: sent ${sent === 1 ? 'the command' : `${sent} commands`}.`)),
        onError,
    });
    const saving = useMutation({ mutationFn: ({ input, buttonId }: { input: ButtonInput; buttonId?: number }) => saveButton(id, input, buttonId), onSuccess: (result) => (update(result), setEditing(null)), onError });
    const removal = useMutation({ mutationFn: (buttonId: number) => deleteButton(id, buttonId), onSuccess: (result) => (update(result), setRemoving(null)), onError });
    const ordering = useMutation({ mutationFn: (ids: number[]) => orderButtons(id, ids), onSuccess: update, onError });
    const place = (row: ReactElement) => (spot ? createPortal(row, spot) : row);

    if (buttons.isError) {
        // Users without the console permission get a 403 and simply see no buttons.
        const { error } = buttons;
        if (typeof error === 'object' && 'response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response && error.response.status === 403) {
            return null;
        }

        return place(
            <div className={`${spot ? 'qcmd:mt-2' : 'qcmd:mb-3'} qcmd:flex qcmd:flex-wrap qcmd:items-center qcmd:gap-2 qcmd:text-xs qcmd:text-destructive`} role='alert'>
                <span>Quick commands could not load: {httpErrorToHuman(buttons.error)}</span>
                <Button.Text size='xsmall' isLoading={buttons.isFetching} onClick={() => buttons.refetch()}>
                    Retry
                </Button.Text>
            </div>,
        );
    }

    if (!buttons.data || (buttons.data.buttons.length === 0 && !buttons.data.can_manage)) {
        return null;
    }

    const click = (button: QuickButton) => {
        if (offline || running.isPending) {
            return;
        }
        if (button.placeholders.length > 0 || button.confirm) {
            setValues(Object.fromEntries(button.placeholders.map((name) => [name, ''])));
            setAsking(button);
        } else {
            running.mutate({ button, values: {} });
        }
    };
    const own = buttons.data.buttons.filter((button) => !button.global);
    const searchable = buttons.data.buttons.length >= SEARCH_FROM;
    const query = searchable ? search.trim().toLowerCase() : '';
    const shown = query ? buttons.data.buttons.filter((button) => button.label.toLowerCase().includes(query) || button.commands.some((command) => command.toLowerCase().includes(query))) : buttons.data.buttons;

    const row = (
        <div className={`${spot ? 'qcmd:mt-2' : 'qcmd:mb-3'} qcmd:flex qcmd:flex-wrap qcmd:items-center qcmd:gap-1.5`}>
            {searchable && (
                <Input
                    aria-label='Search quick commands'
                    placeholder='Search, Enter runs the first'
                    className='qcmd:h-7 qcmd:w-48 qcmd:text-xs'
                    value={search}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && query && shown[0]) {
                            event.preventDefault();
                            click(shown[0]);
                        } else if (event.key === 'Escape') {
                            setSearch('');
                        }
                    }}
                />
            )}
            {shown.map((button) => (
                <QuickChip key={button.id} button={button} disabled={running.isPending || offline} onClick={() => click(button)} title={offline ? 'Start the server to send commands.' : button.commands.join('\n')} />
            ))}
            {query && shown.length === 0 && <span className='qcmd:text-xs qcmd:text-muted-foreground'>No match.</span>}
            {offline && buttons.data.buttons.length > 0 && <span className='qcmd:text-xs qcmd:text-muted-foreground'>Server offline</span>}
            {buttons.data.can_manage && (
                <Button.Text size='xsmall' onClick={() => setManaging(true)}>
                    {buttons.data.buttons.length === 0 ? 'Add quick command' : 'Edit'}
                </Button.Text>
            )}

            {asking && (
                <Dialog open onClose={() => setAsking(null)} title={asking.label} preventExternalClose={running.isPending}>
                    <form
                        id='qcmd-run'
                        className='qcmd:grid qcmd:gap-4'
                        onSubmit={(event) => {
                            event.preventDefault();
                            running.mutate({ button: asking, values });
                        }}
                    >
                        {asking.placeholders.map((name, index) => (
                            <div key={name}>
                                <Label htmlFor={`qcmd-value-${name}`}>{name}</Label>
                                <Input id={`qcmd-value-${name}`} autoFocus={index === 0} maxLength={200} value={values[name] ?? ''} onChange={(event) => setValues({ ...values, [name]: event.currentTarget.value })} />
                            </div>
                        ))}
                        <div>
                            <p className='qcmd:mb-1 qcmd:text-xs qcmd:uppercase qcmd:text-muted-foreground'>Sends</p>
                            <pre className='qcmd:whitespace-pre-wrap qcmd:break-all qcmd:rounded-sm qcmd:bg-terminal qcmd:p-3 qcmd:font-mono qcmd:text-xs qcmd:text-terminal-foreground'>
                                {asking.commands.map((command) => command.replace(/\{([a-z][a-z0-9_]*)\}/gi, (match, name: string) => values[name] || match)).join('\n')}
                            </pre>
                        </div>
                    </form>
                    <Dialog.Footer>
                        <Button.Text className='qcmd:w-full qcmd:sm:w-auto' disabled={running.isPending} onClick={() => setAsking(null)}>
                            Cancel
                        </Button.Text>
                        <Button type='submit' form='qcmd-run' className='qcmd:w-full qcmd:sm:w-auto' disabled={asking.placeholders.some((name) => !values[name]?.trim())} isLoading={running.isPending}>
                            Send
                        </Button>
                    </Dialog.Footer>
                </Dialog>
            )}

            {managing && !editing && !removing && (
                <Dialog open onClose={() => setManaging(false)} title='Quick commands'>
                    <p className='qcmd:mb-4 qcmd:text-sm qcmd:text-muted-foreground'>Buttons for this server. Drag to reorder, or focus one and press Alt+Up/Down. Buttons from the administrator cannot be changed here.</p>
                    {own.length === 0 ? (
                        <Empty size='compact'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon'>
                                    <NamedIcon name='square-terminal' />
                                </EmptyMedia>
                                <EmptyTitle>No buttons of your own</EmptyTitle>
                                <EmptyDescription>Add one for a command you send often, like saving the world.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button onClick={() => setEditing('new')}>New button</Button>
                            </EmptyContent>
                        </Empty>
                    ) : (
                        <SortableList items={own} label={(button) => button.label} disabled={ordering.isPending} onMove={(ids) => ordering.mutateAsync(ids)}>
                            {(button) => (
                                <div className='qcmd:flex qcmd:min-w-0 qcmd:flex-1 qcmd:items-center qcmd:justify-between qcmd:gap-3'>
                                    <div className='qcmd:min-w-0'>
                                        <p className='qcmd:truncate qcmd:text-sm qcmd:text-foreground'>{button.label}</p>
                                        <p className='qcmd:truncate qcmd:font-mono qcmd:text-xs qcmd:text-muted-foreground'>{button.commands.join(' · ')}</p>
                                    </div>
                                    <div className='qcmd:flex qcmd:shrink-0 qcmd:gap-2'>
                                        <Button.Text size='xsmall' onClick={() => setEditing(button)}>
                                            Edit
                                        </Button.Text>
                                        <Button.Danger size='xsmall' onClick={() => setRemoving(button)}>
                                            Delete
                                        </Button.Danger>
                                    </div>
                                </div>
                            )}
                        </SortableList>
                    )}
                    <Dialog.Footer>
                        <Button.Text className='qcmd:w-full qcmd:sm:w-auto' onClick={() => setManaging(false)}>
                            Done
                        </Button.Text>
                        {own.length > 0 && (
                            <Button className='qcmd:w-full qcmd:sm:w-auto' onClick={() => setEditing('new')}>
                                New button
                            </Button>
                        )}
                    </Dialog.Footer>
                </Dialog>
            )}
            {editing && (
                <ButtonDialog
                    button={editing === 'new' ? null : editing}
                    pending={saving.isPending}
                    onClose={() => setEditing(null)}
                    onSave={(input) => saving.mutate({ input, buttonId: editing === 'new' ? undefined : editing.id })}
                />
            )}
            <Dialog.Confirm open={removing !== null} onClose={() => setRemoving(null)} title={`Delete ${removing?.label}?`} confirm='Delete' pending={removal.isPending} onConfirmed={() => removing && removal.mutate(removing.id)}>
                The button disappears from this server for everyone.
            </Dialog.Confirm>
        </div>
    );

    return place(row);
}
