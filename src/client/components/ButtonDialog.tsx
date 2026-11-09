import { useState } from 'react';
import { Button, Dialog, Input, Label, Select, Switch } from '@pterodactyl/sdk';
import type { ButtonInput, Color, QuickButton } from '../api';
import IconPicker from './IconPicker';
import QuickChip from './QuickChip';

export const COLORS: { value: Color; label: string }[] = [
    { value: 'grey', label: 'Grey' },
    { value: 'primary', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'orange', label: 'Orange' },
    { value: 'red', label: 'Red' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'contrast', label: 'Contrast' },
];

interface Props {
    button: QuickButton | null;
    eggs?: { id: number; name: string }[];
    pending: boolean;
    onClose: () => void;
    onSave: (input: ButtonInput) => void;
}

export default function ButtonDialog({ button, eggs, pending, onClose, onSave }: Props) {
    const [input, setInput] = useState<ButtonInput>(
        button
            ? { label: button.label, color: button.color, icon: button.icon, commands: button.commands, confirm: button.confirm, eggs: button.eggs }
            : { label: '', color: 'grey', icon: null, commands: [''], confirm: false, eggs: null }
    );
    const set = (changes: Partial<ButtonInput>) => setInput((current) => ({ ...current, ...changes }));
    const setCommand = (index: number, value: string) => set({ commands: input.commands.map((command, i) => (i === index ? value : command)) });
    const commands = input.commands.map((command) => command.trim()).filter(Boolean);

    return (
        <Dialog open onClose={onClose} title={button ? 'Edit button' : 'New button'} preventExternalClose={pending}>
            <div className='qcmd:grid qcmd:gap-4'>
                <div className='qcmd:grid qcmd:gap-4 qcmd:sm:grid-cols-[minmax(0,1fr)_9rem]'>
                    <div>
                        <Label htmlFor='qcmd-label'>Label</Label>
                        <Input id='qcmd-label' maxLength={48} placeholder='Save world' value={input.label} onChange={(event) => set({ label: event.currentTarget.value })} />
                    </div>
                    <div>
                        <Label htmlFor='qcmd-color'>Colour</Label>
                        <Select id='qcmd-color' value={input.color} onChange={(value) => set({ color: value as Color })} options={COLORS} />
                    </div>
                </div>
                <div>
                    <div className='qcmd:mb-1 qcmd:flex qcmd:items-center qcmd:justify-between qcmd:gap-3'>
                        <Label htmlFor='qcmd-icon'>Icon</Label>
                        <QuickChip button={{ label: input.label.trim() || 'Preview', color: input.color, icon: input.icon }} tabIndex={-1} aria-hidden />
                    </div>
                    <IconPicker value={input.icon} onChange={(icon) => set({ icon })} />
                </div>
                <div>
                    <Label htmlFor='qcmd-command-0'>Commands</Label>
                    <div className='qcmd:grid qcmd:gap-2'>
                        {input.commands.map((command, index) => (
                            <div key={index} className='qcmd:flex qcmd:gap-2'>
                                <Input id={`qcmd-command-${index}`} aria-label={`Command ${index + 1}`} maxLength={500} placeholder='save-all' value={command} onChange={(event) => setCommand(index, event.currentTarget.value)} />
                                {input.commands.length > 1 && (
                                    <Button.Text size='small' onClick={() => set({ commands: input.commands.filter((_, i) => i !== index) })}>
                                        Remove
                                    </Button.Text>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className='qcmd:mt-2 qcmd:flex qcmd:items-center qcmd:justify-between qcmd:gap-3'>
                        <p className='qcmd:text-xs qcmd:text-muted-foreground'>Sent in order. Use {'{player}'} or any {'{name}'} to ask for a value first.</p>
                        {input.commands.length < 10 && (
                            <Button.Text size='xsmall' onClick={() => set({ commands: [...input.commands, ''] })}>
                                Add command
                            </Button.Text>
                        )}
                    </div>
                </div>
                {eggs && (
                    <div>
                        <Label htmlFor='qcmd-eggs'>Show on</Label>
                        <Select id='qcmd-eggs' multiple placeholder='Every server' value={input.eggs ?? []} onChange={(value) => set({ eggs: value.length ? value.map(Number) : null })} options={eggs.map((egg) => ({ value: egg.id, label: egg.name }))} />
                    </div>
                )}
                <label className='qcmd:flex qcmd:items-center qcmd:justify-between qcmd:gap-3 qcmd:text-sm'>
                    <span>Ask before sending</span>
                    <Switch aria-label='Ask before sending' checked={input.confirm} onChange={() => set({ confirm: !input.confirm })} />
                </label>
            </div>
            <Dialog.Footer>
                <Button.Text className='qcmd:w-full qcmd:sm:w-auto' disabled={pending} onClick={onClose}>
                    Cancel
                </Button.Text>
                <Button className='qcmd:w-full qcmd:sm:w-auto' disabled={input.label.trim() === '' || commands.length === 0} isLoading={pending} onClick={() => onSave({ ...input, commands })}>
                    Save
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
}
