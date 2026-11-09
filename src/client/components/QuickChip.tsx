import { Button, NamedIcon, type ButtonColor, type ButtonProps } from '@pterodactyl/sdk';
import type { QuickButton } from '../api';

// The panel's button has five colours; these three are theme tokens drawn on top of its grey one.
const EXTRA: Record<string, string> = {
    cyan: 'qcmd:border-chart-1! qcmd:bg-chart-1! qcmd:text-background! qcmd:hover:bg-chart-1/85!',
    yellow: 'qcmd:border-warning! qcmd:bg-warning! qcmd:text-warning-foreground! qcmd:hover:bg-warning/85!',
    contrast: 'qcmd:border-foreground! qcmd:bg-foreground! qcmd:text-background! qcmd:hover:bg-foreground/85!',
};

type Props = Omit<ButtonProps, 'color'> & { button: Pick<QuickButton, 'label' | 'color' | 'icon'> };

/** A quick command as the console shows it: its colour, icon and label. */
export default function QuickChip({ button, className = '', ...props }: Props) {
    const extra = EXTRA[button.color];

    return (
        <Button size='xsmall' color={extra ? 'grey' : (button.color as ButtonColor)} isSecondary={button.color === 'grey'} className={`${extra ?? ''} ${className}`} {...(props as ButtonProps)}>
            <span className='qcmd:inline-flex qcmd:items-center qcmd:gap-1.5'>
                {button.icon && <NamedIcon name={button.icon} size={14} aria-hidden />}
                {button.label}
            </span>
        </Button>
    );
}
