import React from 'react';
import type { Project, Task, TaskType } from '../lib/logic';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskTableProps {
    project: Project;
    onUpdate: (tasks: Task[]) => void;
}

// Sub-component for Sortable Row
const SortableRow = ({ task, index, onChange, onDelete }: {
    task: Task;
    index: number;
    onChange: (index: number, field: keyof Task, value: any) => void;
    onDelete: (index: number) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        position: isDragging ? 'relative' as const : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} className={`group ${isDragging ? "bg-blue-50 shadow-lg dark:bg-blue-900/50" : "hover:bg-gray-50 bg-white dark:bg-gray-800 dark:hover:bg-gray-700"}`}>
            <td className="p-2 text-center text-gray-400 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
                <GripVertical size={16} className="mx-auto" />
            </td>
            <td className="p-2 text-center text-gray-500 dark:text-gray-400 font-mono text-xs">
                {task.serialNumber}
            </td>
            <td className="p-2">
                <input
                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1 dark:text-gray-300 dark:focus:ring-gray-500"
                    value={task.id}
                    onChange={(e) => onChange(index, 'id', e.target.value)}
                />
            </td>
            <td className="p-2">
                <input
                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1 dark:text-gray-300 dark:focus:ring-gray-500"
                    value={task.phase}
                    onChange={(e) => onChange(index, 'phase', e.target.value)}
                />
            </td>
            <td className="p-2">
                <input
                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1 dark:text-gray-300 dark:focus:ring-gray-500"
                    value={task.name}
                    onChange={(e) => onChange(index, 'name', e.target.value)}
                />
            </td>
            <td className="p-2">
                <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1 dark:text-gray-300 dark:focus:ring-gray-500"
                    value={task.durationWeeks}
                    onChange={(e) => onChange(index, 'durationWeeks', parseFloat(e.target.value))}
                />
            </td>
            <td className="p-2">
                <input
                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1 dark:text-gray-300 dark:focus:ring-gray-500"
                    value={task.predecessors.join(", ")}
                    onChange={(e) => onChange(index, 'predecessors', e.target.value)}
                />
            </td>
            <td className="p-2">
                <select
                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1 dark:text-gray-300 dark:focus:ring-gray-500 dark:bg-gray-800"
                    value={task.type}
                    onChange={(e) => onChange(index, 'type', e.target.value as TaskType)}
                >
                    <option value="Standard">Standard</option>
                    <option value="Milestone">Milestone</option>
                    <option value="Bottleneck">Bottleneck</option>
                    <option value="Key Decision">Key Decision</option>
                    <option value="External Dependency">Ext. Dep</option>
                </select>
            </td>
            <td className="p-2 text-center">
                <button onClick={() => onDelete(index)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                    <Trash2 size={16} />
                </button>
            </td>
        </tr>
    );
};

export const TaskTable: React.FC<TaskTableProps> = ({ project, onUpdate }) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags on click
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = project.tasks.findIndex((t) => t.id === active.id);
            const newIndex = project.tasks.findIndex((t) => t.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                onUpdate(arrayMove(project.tasks, oldIndex, newIndex));
            }
        }
    };

    const handleChange = (index: number, field: keyof Task, value: any) => {
        const newTasks = [...project.tasks];
        // @ts-ignore - dynamic assign
        newTasks[index][field] = value;

        // Handle predecessors string splitting if needed
        if (field === "predecessors" && typeof value === "string") {
            newTasks[index].predecessors = value.split(",").map(s => s.trim()).filter(Boolean);
        }

        onUpdate(newTasks);
    };

    const handleAdd = () => {
        const newId = `T${project.tasks.length + 1}`;
        const newTask: Task = {
            id: newId,
            name: "New Task",
            phase: "New Phase",
            durationWeeks: 1.0,
            predecessors: [],
            type: "Standard",
            originalDurationWeeks: 1.0,
            compressionRatio: 1.0
        };
        onUpdate([...project.tasks, newTask]);
    };

    const handleDelete = (index: number) => {
        const newTasks = [...project.tasks];
        newTasks.splice(index, 1);
        onUpdate(newTasks);
    };

    return (
        <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 shadow-sm dark:border-gray-700">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold border-b dark:border-gray-600">
                        <tr>
                            <th className="p-3 w-8"></th>
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3 w-16">ID</th>
                            <th className="p-3 w-32">Phase</th>
                            <th className="p-3">Task Name</th>
                            <th className="p-3 w-20">Dur (Wks)</th>
                            <th className="p-3 w-24">Preds</th>
                            <th className="p-3 w-32">Type</th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <SortableContext
                        items={project.tasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {project.tasks.map((task, i) => (
                                <SortableRow
                                    key={task.id}
                                    task={task}
                                    index={i}
                                    onChange={handleChange}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </tbody>
                    </SortableContext>
                </table>
            </DndContext>

            <div className="p-2 border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <button onClick={handleAdd} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    <Plus size={16} /> Add Task
                </button>
            </div>
        </div>
    );
};
