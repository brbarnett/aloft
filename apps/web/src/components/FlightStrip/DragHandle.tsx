import { useSortable } from '@dnd-kit/sortable';

type SortableReturn = ReturnType<typeof useSortable>;

interface Props {
    listeners: SortableReturn['listeners'];
    attributes: SortableReturn['attributes'];
}

const DragHandle = ({ listeners, attributes }: Props) => (
    <div
        {...listeners}
        {...attributes}
        style={{ cursor: 'grab', touchAction: 'none' }}
        className="text-[#2a5c2a] hover:text-[#4ade80] px-1 flex-shrink-0 select-none flex items-center self-stretch"
        onClick={(e) => e.stopPropagation()}
    >
        ⠿
    </div>
);

export default DragHandle;
