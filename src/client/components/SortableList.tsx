import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { Icon } from '@pterodactyl/sdk';

interface Props<T extends { id: number }> {
    items: T[];
    label: (item: T) => string;
    disabled?: boolean;
    /** Saves the order; a rejection puts the list back. */
    onMove: (ids: number[]) => Promise<unknown>;
    children: (item: T) => ReactNode;
}

const move = <T,>(list: T[], from: number, to: number): T[] => {
    const next = [...list];
    next.splice(to, 0, ...next.splice(from, 1));

    return next;
};

/** A list reordered by dragging a row, or by focusing it and pressing Alt+Up/Down. */
export default function SortableList<T extends { id: number }>({ items, label, disabled, onMove, children }: Props<T>) {
    // The order while dragging or saving, until the saved list comes back.
    const [draft, setDraft] = useState<number[] | null>(null);
    const saved = items.map((item) => item.id).join();
    const order = draft ? draft.flatMap((id) => items.filter((item) => item.id === id)) : items;
    const [dragging, setDragging] = useState<number | null>(null);
    const [focus, setFocus] = useState<number | null>(null);
    const rows = useRef(new Map<number, HTMLLIElement>());

    useEffect(() => setDraft(null), [saved]);
    useEffect(() => {
        if (focus !== null) {
            rows.current.get(focus)?.focus();
        }
    }, [order, focus]);

    const commit = (next: T[]) => {
        const ids = next.map((item) => item.id);

        if (ids.join() === saved) {
            setDraft(null);
            return;
        }
        setDraft(ids);
        onMove(ids).catch(() => setDraft(null));
    };

    return (
        <ul className='qcmd:grid qcmd:gap-2'>
            {order.map((item, index) => (
                <li
                    key={item.id}
                    ref={(node) => void (node ? rows.current.set(item.id, node) : rows.current.delete(item.id))}
                    tabIndex={0}
                    draggable={!disabled}
                    aria-label={`${label(item)}, position ${index + 1} of ${order.length}. Alt+Up or Alt+Down moves it.`}
                    className={`qcmd:flex qcmd:items-center qcmd:gap-2 qcmd:rounded-sm qcmd:bg-sunken qcmd:py-2 qcmd:pr-3 qcmd:pl-1.5 qcmd:outline-none qcmd:focus-visible:ring-2 qcmd:focus-visible:ring-primary ${dragging === item.id ? 'qcmd:opacity-50' : ''}`}
                    onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(item.id));
                        setDragging(item.id);
                    }}
                    onDragOver={(event) => {
                        if (dragging === null || dragging === item.id) {
                            return;
                        }
                        event.preventDefault();
                        setDraft(move(order, order.findIndex((other) => other.id === dragging), index).map((other) => other.id));
                    }}
                    onDrop={(event) => event.preventDefault()}
                    onDragEnd={() => {
                        setDragging(null);
                        commit(order);
                    }}
                    onKeyDown={(event) => {
                        if (disabled || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || event.target !== event.currentTarget) {
                            return;
                        }
                        event.preventDefault();
                        const to = index + (event.key === 'ArrowUp' ? -1 : 1);
                        if (to >= 0 && to < order.length) {
                            setFocus(item.id);
                            commit(move(order, index, to));
                        }
                    }}
                >
                    <Icon icon={GripVertical} className='qcmd:size-4 qcmd:shrink-0 qcmd:cursor-grab qcmd:text-muted-foreground' aria-hidden />
                    {children(item)}
                </li>
            ))}
        </ul>
    );
}
