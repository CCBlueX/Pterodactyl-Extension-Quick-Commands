import { useEffect, useMemo, useState } from 'react';
import { Button, Input, NamedIcon, loadIconNames } from '@pterodactyl/sdk';

const SHOWN = 48;

/** A searchable grid of the panel's lucide icons. */
export default function IconPicker({ value, onChange }: { value: string | null; onChange: (icon: string | null) => void }) {
    const [names, setNames] = useState<readonly string[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let active = true;
        loadIconNames().then((loaded) => active && setNames(loaded));

        return () => {
            active = false;
        };
    }, []);

    const matches = useMemo(() => {
        const query = search.trim().toLowerCase().replace(/\s+/g, '-');

        return names.filter((name) => name.includes(query)).slice(0, SHOWN);
    }, [names, search]);

    return (
        <div className='qcmd:grid qcmd:gap-2'>
            <div className='qcmd:flex qcmd:items-center qcmd:gap-2'>
                <Input id='qcmd-icon' placeholder='Search icons' value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
                {value && (
                    <Button.Text size='small' onClick={() => onChange(null)}>
                        No icon
                    </Button.Text>
                )}
            </div>
            <div className='qcmd:grid qcmd:max-h-36 qcmd:grid-cols-8 qcmd:gap-1 qcmd:overflow-y-auto qcmd:rounded-sm qcmd:bg-sunken qcmd:p-1.5' role='listbox' aria-label='Icons'>
                {matches.map((name) => (
                    <button
                        key={name}
                        type='button'
                        role='option'
                        aria-selected={name === value}
                        aria-label={name}
                        title={name}
                        className={`qcmd:flex qcmd:aspect-square qcmd:items-center qcmd:justify-center qcmd:rounded-sm qcmd:text-foreground qcmd:hover:bg-card ${name === value ? 'qcmd:bg-primary qcmd:text-primary-foreground qcmd:hover:bg-primary' : ''}`}
                        onClick={() => onChange(name)}
                    >
                        <NamedIcon name={name} size={16} />
                    </button>
                ))}
                {names.length > 0 && matches.length === 0 && <p className='qcmd:col-span-8 qcmd:p-2 qcmd:text-xs qcmd:text-muted-foreground'>No icon matches.</p>}
            </div>
        </div>
    );
}
