import React from 'react';
import type { Project, Task, TaskType } from '../lib/logic';
import { Trash2, Plus } from 'lucide-react';

interface TaskTableProps {
    project: Project;
    onUpdate: (tasks: Task[]) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({ project, onUpdate }) => {

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
        <div className="border rounded-lg overflow-x-auto bg-white shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                    <tr>
                        <th className="p-3 w-16">ID</th>
                        <th className="p-3 w-32">Phase</th>
                        <th className="p-3">Task Name</th>
                        <th className="p-3 w-20">Dur (Wks)</th>
                        <th className="p-3 w-24">Preds</th>
                        <th className="p-3 w-32">Type</th>
                        <th className="p-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {project.tasks.map((task, i) => (
                        <tr key={i} className="hover:bg-gray-50 group">
                            <td className="p-2">
                                <input
                                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1"
                                    value={task.id}
                                    onChange={(e) => handleChange(i, 'id', e.target.value)}
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1"
                                    value={task.phase}
                                    onChange={(e) => handleChange(i, 'phase', e.target.value)}
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1"
                                    value={task.name}
                                    onChange={(e) => handleChange(i, 'name', e.target.value)}
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1"
                                    value={task.durationWeeks}
                                    onChange={(e) => handleChange(i, 'durationWeeks', parseFloat(e.target.value))}
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1"
                                    value={task.predecessors.join(", ")}
                                    onChange={(e) => handleChange(i, 'predecessors', e.target.value)}
                                />
                            </td>
                            <td className="p-2">
                                <select
                                    className="w-full bg-transparent border-none focus:ring-1 rounded px-1"
                                    value={task.type}
                                    onChange={(e) => handleChange(i, 'type', e.target.value as TaskType)}
                                >
                                    <option value="Standard">Standard</option>
                                    <option value="Milestone">Milestone</option>
                                    <option value="Bottleneck">Bottleneck</option>
                                    <option value="Key Decision">Key Decision</option>
                                    <option value="External Dependency">Ext. Dep</option>
                                </select>
                            </td>
                            <td className="p-2 text-center">
                                <button onClick={() => handleDelete(i)} className="text-gray-400 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="p-2 border-t bg-gray-50">
                <button onClick={handleAdd} className="flex items-center gap-1 text-sm text-blue-600 font-semibold hover:underline">
                    <Plus size={16} /> Add Task
                </button>
            </div>
        </div>
    );
};
