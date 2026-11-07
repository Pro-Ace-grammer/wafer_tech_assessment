import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

// TypeScript definitions based on your Prisma schema
interface Task {
    id: string;
    name: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    order: string;
    assigneeId: string | null;
    createdAt: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string | null;
}

interface ProjectData {
    id: string;
    name: string;
    tasks: Task[];
}

export default function ProjectBoard() {
    const { projectId } = useParams(); // Grabs the ID from the URL (e.g., /projects/123)
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();

    // Tabbed view state
    const [activeView, setActiveView] = useState<'BOARD' | 'MEMBERS' | 'SETTINGS'>('BOARD');
    const [taskView, setTaskView] = useState<'BOARD' | 'LIST'>('BOARD');

    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // State for the Add Task modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [newDueDate, setNewDueDate] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // State for the Update Task modal
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editName, setEditName] = useState('');
    const [editStatus, setEditStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('PENDING');
    const [editAssigneeEmail, setEditAssigneeEmail] = useState('');
    const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [editDueDate, setEditDueDate] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    const [teamMembers, setTeamMembers] = useState<any[]>([]);

    const [searchQuery, setSearchQuery] = useState('');

    // Fetch the project and its tasks when the page loads
    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                // 1. Fetch the project and tasks
                const projResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProject(projResponse.data.project);

                // 2. Fetch the team members for this project
                const membersResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/members`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Depending on your Prisma setup, the array might be called 'members' or just the raw array
                setTeamMembers(membersResponse.data.members || membersResponse.data || []);

            } catch (err) {
                setError('Failed to load project board.');
            } finally {
                setLoading(false);
            }
        };

        if (projectId) fetchProjectDetails();
    }, [projectId, token]);


    // --- REAL-TIME WEBSOCKETS ENGINE ---
    useEffect(() => {
        if (!projectId) return;

        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
        socket.emit('joinProject', projectId);

        // 3. Listen for a new task being created
        socket.on('taskCreated', (newTask: Task) => {
            // Toast OUTSIDE the state updater, with a unique ID to prevent duplicates
            toast(`Task "${newTask.name}" was created.`, {
                id: `create-${newTask.id}`,
                icon: (
                    <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )
            });

            setProject(prevProject => {
                if (!prevProject) return prevProject;
                if (prevProject.tasks.find(t => t.id === newTask.id)) return prevProject;
                return { ...prevProject, tasks: [...prevProject.tasks, newTask] };
            });
        });

        // 4. Listen for a task being updated or moved (Drag & Drop)
        socket.on('taskUpdated', (updatedTask: Task) => {
            toast(`Task "${updatedTask.name}" was updated.`, {
                id: `update-${updatedTask.id}`,
                icon: (
                    <svg className="w-4 h-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                )
            });

            setProject(prevProject => {
                if (!prevProject) return prevProject;
                return { ...prevProject, tasks: prevProject.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) };
            });
        });

        // 5. Listen for a task being deleted
        socket.on('taskDeleted', (deletedTaskId: string) => {
            toast(`A task was deleted.`, {
                id: `delete-${deletedTaskId}`,
                icon: (
                    <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                )
            });

            setProject(prevProject => {
                if (!prevProject) return prevProject;
                return { ...prevProject, tasks: prevProject.tasks.filter(t => t.id !== deletedTaskId) };
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [projectId]);

    // Below function handles tasks creation
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName.trim()) return;
        setIsCreating(true);

        try {
            // POST to our backend endpoint
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/tasks`,
                {
                    name: newTaskName,
                    status: 'PENDING',
                    priority: newPriority,
                    dueDate: newDueDate || null,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update the UI instantly by adding the new task to our state
            if (project) {
                setProject({
                    ...project,
                    tasks: [...project.tasks, response.data.task]
                });
            }

            // Close and reset modal
            setIsModalOpen(false);
            setNewTaskName('');
            setNewPriority('MEDIUM');
            setNewDueDate('');
        } catch (err) {
            alert("Failed to create task");
        } finally {
            setIsCreating(false);
        }
    };

    // Task delete handle
    const handleDeleteTask = async (taskId: string) => {
        // Quick browser confirmation so they don't accidentally click it
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Instantly remove it from the UI state
            if (project) {
                setProject({
                    ...project,
                    tasks: project.tasks.filter(t => t.id !== taskId)
                });
            }
        } catch (err) {
            alert("Failed to delete task. Make sure you are an Admin.");
        }
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setEditName(task.name);
        setEditStatus(task.status);

        if (task.assigneeId) {
            const member = teamMembers.find(m =>
                (m.user?.id === task.assigneeId) || (m.id === task.assigneeId) || (m.userId === task.assigneeId)
            );
            setEditAssigneeEmail(member?.user?.email || member?.email || '');
        } else {
            setEditAssigneeEmail('');
        }

        setEditPriority((task.priority as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM');
        setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask || !project) return;

        let finalAssigneeId: string | null = null;
        if (user?.role === 'ADMIN') {
            const trimmedEmail = editAssigneeEmail.trim();
            if (trimmedEmail) {
                const matchedMember = teamMembers.find(m => {
                    const memberEmail = m.user?.email || m.email;
                    return memberEmail && memberEmail.toLowerCase() === trimmedEmail.toLowerCase();
                });

                if (!matchedMember) {
                    toast.error('User is not a member of this project');
                    return;
                }

                finalAssigneeId = matchedMember.user?.id || matchedMember.id || matchedMember.userId || null;
            } else {
                finalAssigneeId = null;
            }
        }

        setIsUpdating(true);

        try {
            // We only send the assigneeId if the user is an Admin, matching our backend rules
            const payload: any = {
                name: editName,
                status: editStatus,
                priority: editPriority,
                dueDate: editDueDate || null,
            };
            if (user?.role === 'ADMIN') {
                payload.assigneeId = finalAssigneeId;
            }

            const response = await axios.patch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/tasks/${editingTask.id}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Instantly update the specific task in our UI state
            setProject({
                ...project,
                tasks: project.tasks.map(t => t.id === editingTask.id ? response.data.task : t)
            });

            setEditingTask(null); // Close modal
        } catch (err) {
            alert("Failed to update task.");
        } finally {
            setIsUpdating(false);
        }
    };


    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/members`,
                { email: inviteEmail },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("Member added successfully!");
            setIsInviteModalOpen(false);
            setInviteEmail('');
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to add member.");
        }
    };


    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        // 1. If dropped outside a column, do nothing
        if (!destination) return;

        // 2. If dropped in the exact same spot, do nothing
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (!project) return;

        // 3. Find the tasks in the destination column to figure out the LexoRank neighbors
        const destTasks = project.tasks
            .filter(t => t.status === destination.droppableId)
            .sort((a, b) => a.order.localeCompare(b.order));

        // Remove the dragged task from the calculation if it was already in this column
        const filteredDestTasks = destTasks.filter(t => t.id !== draggableId);

        // 4. Determine the 'order' strings of the tasks directly above and below the drop zone
        let prevOrder = null;
        let nextOrder = null;

        if (destination.index > 0) {
            prevOrder = filteredDestTasks[destination.index - 1]?.order || null;
        }
        if (destination.index < filteredDestTasks.length) {
            nextOrder = filteredDestTasks[destination.index]?.order || null;
        }

        // 5. Optimistic UI Update: Instantly move the card on the screen so it feels fast
        const updatedTasks = project.tasks.map(t => {
            if (t.id === draggableId) {
                return { ...t, status: destination.droppableId as any };
            }
            return t;
        });
        setProject({ ...project, tasks: updatedTasks });

        // 6. Hit the Backend API to permanently save the new position
        try {
            const response = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/projects/${projectId}/tasks/${draggableId}/reorder`,
                {
                    status: destination.droppableId,
                    prevOrder,
                    nextOrder
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update the task with the exact, mathematically perfect LexoRank string generated by your backend
            setProject(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tasks: prev.tasks.map(t => t.id === draggableId ? response.data.task : t)
                };
            });
        } catch (err) {
            alert("Failed to reorder task.");
            // Optional: If it fails, refresh the page to revert the UI
            window.location.reload();
        }
    };


    // Helper to find a user's email based on their ID so we can display it on the card
    const getAssigneeEmail = (assigneeId: string | null) => {
        if (!assigneeId) return null;
        const member = teamMembers.find(m =>
            (m.user?.id === assigneeId) || (m.id === assigneeId) || (m.userId === assigneeId)
        );
        return member?.user?.email || member?.email || 'Unknown User';
    };

    // Shared Sidebar Component to match Dashboard cohesively
    const sidebarContent = (
        <div className="flex flex-col h-full justify-between bg-gray-950 text-gray-300">
            {/* Top Branding & Navigation */}
            <div>
                {/* Sleek Logo Area */}
                <div className="p-6 flex items-center justify-between border-b border-gray-850">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-white/10">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-base font-bold tracking-tight text-white block">ChaosControl</span>
                            <span className="text-[10px] font-medium text-gray-400 tracking-wider uppercase">Workspace OS</span>
                        </div>
                    </div>
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation Items (Switches activeView) */}
                <nav className="p-4 space-y-1.5">
                    <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Navigation
                    </div>

                    {/* Back to Workspaces */}
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-850 transition-colors text-left"
                    >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Workspaces</span>
                    </button>

                    {/* Tab 1: Tasks Board */}
                    <button
                        onClick={() => { setActiveView('BOARD'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left ${activeView === 'BOARD'
                            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs'
                            : 'text-gray-400 hover:text-white hover:bg-gray-850'
                            }`}
                    >
                        <svg className={`w-4 h-4 ${activeView === 'BOARD' ? 'text-blue-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span>Tasks Board</span>
                    </button>

                    {/* Tab 2: Members */}
                    <button
                        onClick={() => { setActiveView('MEMBERS'); setSidebarOpen(false); }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left ${activeView === 'MEMBERS'
                            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs'
                            : 'text-gray-400 hover:text-white hover:bg-gray-850'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className={`w-4 h-4 ${activeView === 'MEMBERS' ? 'text-blue-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span>Members</span>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${activeView === 'MEMBERS' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-850 text-gray-400 border border-gray-750'
                            }`}>
                            {teamMembers.length}
                        </span>
                    </button>

                    {/* Tab 3: Settings */}
                    <button
                        onClick={() => { setActiveView('SETTINGS'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left ${activeView === 'SETTINGS'
                            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs'
                            : 'text-gray-400 hover:text-white hover:bg-gray-850'
                            }`}
                    >
                        <svg className={`w-4 h-4 ${activeView === 'SETTINGS' ? 'text-blue-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                    </button>
                </nav>
            </div>

            {/* Bottom User Profile Section */}
            <div className="p-4 border-t border-gray-850 bg-gray-950/80">
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-900/60 border border-gray-800/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0 shadow-sm">
                            {user?.email ? user.email[0] : 'U'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate max-w-[130px]">
                                {user?.email}
                            </p>
                            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 tracking-wider uppercase ${user?.role === 'ADMIN'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                {user?.role}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        title="Log out"
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm font-medium">Loading project board...</span>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="p-6 rounded-xl bg-white border border-red-200 text-center shadow-sm max-w-md">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Failed to load board</h2>
                    <p className="text-sm text-gray-500 mb-4">{error || 'Project not found.'}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                    >
                        Return to Workspaces
                    </button>
                </div>
            </div>
        );
    }

    // Filter tasks into their respective columns based on status
    // 1. First, filter tasks based on the search query
    const searchedTasks = project.tasks.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Then, split the searched tasks into their columns and sort by LexoRank
    const pendingTasks = searchedTasks.filter(t => t.status === 'PENDING').sort((a, b) => a.order.localeCompare(b.order));
    const inProgressTasks = searchedTasks.filter(t => t.status === 'IN_PROGRESS').sort((a, b) => a.order.localeCompare(b.order));
    const completedTasks = searchedTasks.filter(t => t.status === 'COMPLETED').sort((a, b) => a.order.localeCompare(b.order));

    // Dynamic header title helper
    const getHeaderTitle = () => {
        if (activeView === 'MEMBERS') return `${project.name} / Members`;
        if (activeView === 'SETTINGS') return `${project.name} / Settings`;
        return project.name;
    };

    return (
        <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans antialiased">
            {/* Mobile Sidebar Overlay Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile Drawer Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-950 border-r border-gray-800/80 transform transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {sidebarContent}
            </aside>

            {/* Desktop Persistent Dark Sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-gray-950 border-r border-gray-800/80 min-h-screen sticky top-0 h-screen">
                {sidebarContent}
            </aside>

            {/* Main Content Area (Light Canvas) */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50 h-screen overflow-hidden">
                {/* Board Top Navbar with Dynamic Titles */}
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 sm:px-8 py-3.5 flex items-center justify-between shrink-0 z-20">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Hamburger Button for Mobile */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            aria-label="Open sidebar"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="hidden sm:inline">Workspaces</span>
                        </button>
                        <span className="text-gray-300 hidden sm:inline">/</span>
                        <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                            {getHeaderTitle()}
                        </h1>
                    </div>

                    {/* Top Header Actions (Only show + Add Task when in 'BOARD' view) */}
                    <div className="flex items-center gap-3 shrink-0 flex-1 justify-end">
                        {activeView === 'BOARD' && (
                            <>
                                {/* View Toggle (Board vs List) */}
                                <div className="inline-flex items-center p-1 bg-gray-100 border border-gray-200/80 rounded-lg shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setTaskView('BOARD')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${taskView === 'BOARD'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                        <span>Board</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTaskView('LIST')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${taskView === 'LIST'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                        <span>List</span>
                                    </button>
                                </div>

                                {/* The New Search Bar */}
                                <div className="relative w-full max-w-xs sm:max-w-sm">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search tasks..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm shadow-sm transition-all"
                                    />
                                </div>

                                {/* Your Styled Add Task Button */}
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex shrink-0 items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="hidden sm:inline">Add Task</span>
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* 1. TASKS VIEW (BOARD VS LIST) */}
                {activeView === 'BOARD' && (
                    taskView === 'BOARD' ? (
                        <main className="flex-1 overflow-x-auto p-6 sm:p-8">
                            <DragDropContext onDragEnd={onDragEnd}>
                                <div className="flex gap-6 h-full items-start">
                                    {/* We map over an array of our columns to keep the code clean */}
                                    {[
                                        { id: 'PENDING', title: 'Pending', tasks: pendingTasks, dot: 'bg-gray-400', color: 'bg-gray-200/70 text-gray-700 border-gray-300/60' },
                                        { id: 'IN_PROGRESS', title: 'In Progress', tasks: inProgressTasks, dot: 'bg-blue-500', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                                        { id: 'COMPLETED', title: 'Completed', tasks: completedTasks, dot: 'bg-emerald-500', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                                    ].map(column => (
                                        <div
                                            key={column.id}
                                            className="bg-gray-100/70 border border-gray-200/80 rounded-2xl w-80 sm:w-84 flex-shrink-0 flex flex-col max-h-[calc(100vh-140px)] shadow-xs transition-colors"
                                        >
                                            {/* Column Header */}
                                            <div className="p-3.5 border-b border-gray-200/70 flex justify-between items-center bg-gray-100/50 rounded-t-2xl">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${column.dot}`} />
                                                    <h2 className="font-semibold text-sm text-gray-800 tracking-tight">{column.title}</h2>
                                                </div>
                                                <span className={`${column.color} text-xs font-semibold px-2 py-0.5 rounded-full border`}>
                                                    {column.tasks.length}
                                                </span>
                                            </div>

                                            {/* Droppable Zone */}
                                            <Droppable droppableId={column.id}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`p-3 flex-1 overflow-y-auto space-y-3 min-h-[160px] transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-blue-50/40' : ''
                                                            }`}
                                                    >
                                                        {column.tasks.map((task, index) => (
                                                            /* Draggable Card */
                                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        onClick={() => openEditModal(task)}
                                                                        className={`bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group relative cursor-grab active:cursor-grabbing ${snapshot.isDragging
                                                                            ? 'shadow-2xl ring-2 ring-blue-600 border-transparent rotate-1 scale-[1.02]'
                                                                            : 'shadow-xs'
                                                                            }`}
                                                                        style={{ ...provided.draggableProps.style }}
                                                                    >
                                                                        {/* Priority Pill at Top-Left & Due Date with Calendar Icon */}
                                                                        {(task.priority || task.dueDate) && (
                                                                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                                                                {task.priority && (
                                                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${task.priority.toUpperCase() === 'HIGH'
                                                                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                                                                        : task.priority.toUpperCase() === 'MEDIUM'
                                                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                                        }`}>
                                                                                        {task.priority}
                                                                                    </span>
                                                                                )}
                                                                                {task.dueDate && (
                                                                                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200/60 px-1.5 py-0.5 rounded">
                                                                                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                        </svg>
                                                                                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Task Title */}
                                                                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors pr-6 leading-snug">
                                                                            {task.name}
                                                                        </p>

                                                                        {/* Card Bottom: Assignee Avatar + Created Date pushed to bottom right */}
                                                                        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-gray-100">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                {task.assigneeId ? (
                                                                                    <>
                                                                                        <div
                                                                                            className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-xs shrink-0"
                                                                                            title={getAssigneeEmail(task.assigneeId) || undefined}
                                                                                        >
                                                                                            {getAssigneeEmail(task.assigneeId)?.charAt(0).toUpperCase()}
                                                                                        </div>
                                                                                        <span
                                                                                            className="text-xs text-gray-600 truncate max-w-[110px]"
                                                                                            title={getAssigneeEmail(task.assigneeId) || undefined}
                                                                                        >
                                                                                            {getAssigneeEmail(task.assigneeId)}
                                                                                        </span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <div className="w-6 h-6 rounded-full bg-gray-100 border border-dashed border-gray-300 text-gray-400 flex items-center justify-center text-[10px] font-semibold shrink-0">
                                                                                            ?
                                                                                        </div>
                                                                                        <span className="text-xs text-gray-400">Unassigned</span>
                                                                                    </>
                                                                                )}
                                                                            </div>

                                                                            {/* Created Date pushed to bottom right */}
                                                                            <span className="text-xs text-gray-400 ml-auto shrink-0 font-normal">
                                                                                {new Date(task.createdAt).toLocaleDateString()}
                                                                            </span>
                                                                        </div>

                                                                        {/* Delete Button */}
                                                                        {user?.role === 'ADMIN' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteTask(task.id);
                                                                                }}
                                                                                title="Delete task"
                                                                                className="absolute top-3 right-3 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-150"
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    ))}
                                </div>
                            </DragDropContext>
                        </main>
                    ) : (
                        /* 1b. TASKS LIST VIEW */
                        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                {searchedTasks.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-3">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900">No tasks found</h3>
                                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                            {searchQuery ? `No tasks matched "${searchQuery}".` : "Get started by adding a new task to this project."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                    <th className="py-3.5 px-6">Task Name</th>
                                                    <th className="py-3.5 px-6">Status</th>
                                                    <th className="py-3.5 px-6">Priority</th>
                                                    <th className="py-3.5 px-6">Due Date</th>
                                                    <th className="py-3.5 px-6">Assignee</th>
                                                    <th className="py-3.5 px-6">Created</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-sm">
                                                {searchedTasks.map(task => {
                                                    const assigneeEmail = getAssigneeEmail(task.assigneeId);
                                                    return (
                                                        <tr
                                                            key={task.id}
                                                            onClick={() => openEditModal(task)}
                                                            className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                                                        >
                                                            {/* Task Name */}
                                                            <td className="py-4 px-6">
                                                                <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                                    {task.name}
                                                                </span>
                                                            </td>

                                                            {/* Status */}
                                                            <td className="py-4 px-6 whitespace-nowrap">
                                                                {task.status === 'COMPLETED' ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                        Completed
                                                                    </span>
                                                                ) : task.status === 'IN_PROGRESS' ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                        In Progress
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                                        Pending
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Priority */}
                                                            <td className="py-4 px-6 whitespace-nowrap">
                                                                {task.priority ? (
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${task.priority.toUpperCase() === 'HIGH'
                                                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                                                        : task.priority.toUpperCase() === 'MEDIUM'
                                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                        }`}>
                                                                        {task.priority}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">—</span>
                                                                )}
                                                            </td>

                                                            {/* Due Date */}
                                                            <td className="py-4 px-6 whitespace-nowrap">
                                                                {task.dueDate ? (
                                                                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200/60 px-2.5 py-1 rounded-md">
                                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                        </svg>
                                                                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">—</span>
                                                                )}
                                                            </td>

                                                            {/* Assignee */}
                                                            <td className="py-4 px-6">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    {assigneeEmail ? (
                                                                        <>
                                                                            <div
                                                                                className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase ring-2 ring-white shadow-xs shrink-0"
                                                                                title={assigneeEmail}
                                                                            >
                                                                                {assigneeEmail.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <span
                                                                                className="text-sm text-gray-700 truncate max-w-[180px]"
                                                                                title={assigneeEmail}
                                                                            >
                                                                                {assigneeEmail}
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="w-7 h-7 rounded-full bg-gray-100 border border-dashed border-gray-300 text-gray-400 flex items-center justify-center text-xs font-semibold shrink-0">
                                                                                ?
                                                                            </div>
                                                                            <span className="text-sm text-gray-400 italic">Unassigned</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Created */}
                                                            <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">
                                                                <div className="flex items-center justify-between">
                                                                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                                                    {user?.role === 'ADMIN' && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteTask(task.id);
                                                                            }}
                                                                            title="Delete task"
                                                                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-150"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </main>
                    ))}

                {/* 2. MEMBERS VIEW */}
                {activeView === 'MEMBERS' && (
                    <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto">
                        {/* Members Header Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-gray-200">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                                    Project Members
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Collaborators with access to this board and its associated tasks.
                                </p>
                            </div>

                            {/* + Invite Member Button moved here */}
                            {user?.role === 'ADMIN' && (
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98] shrink-0"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                    <span>Invite Member</span>
                                </button>
                            )}
                        </div>

                        {/* Members Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {teamMembers.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900">No members found</h3>
                                    <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                        Invite your team members to collaborate on tasks in this workspace.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <th className="py-3.5 px-6">Collaborator</th>
                                                <th className="py-3.5 px-6">User ID</th>
                                                <th className="py-3.5 px-6">Role</th>
                                                <th className="py-3.5 px-6 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {teamMembers.map((member, index) => {
                                                const id = member.user?.id || member.id || member.userId || `member-${index}`;
                                                const email = member.user?.email || member.email || 'Unknown Email';
                                                const isCurrentUser = user?.email && email.toLowerCase() === user.email.toLowerCase();

                                                return (
                                                    <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                                                        {/* Collaborator info */}
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                                                                    {email.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-gray-900">{email}</span>
                                                                        {isCurrentUser && (
                                                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                                                You
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-400 mt-0.5">Project Member</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* User ID */}
                                                        <td className="py-4 px-6">
                                                            <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200/80 select-all">
                                                                {id}
                                                            </span>
                                                        </td>

                                                        {/* Role */}
                                                        <td className="py-4 px-6">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                                Member
                                                            </span>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-6 text-right">
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Active
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </main>
                )}

                {/* 3. SETTINGS VIEW (Placeholder) */}
                {activeView === 'SETTINGS' && (
                    <main className="flex-1 overflow-y-auto p-6 sm:p-8 flex items-center justify-center">
                        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm text-center max-w-md w-full">
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-4 border border-gray-200">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Project Settings</h2>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                Project Settings coming soon. Workspace permissions, webhooks, and project archiving will be available here.
                            </p>
                        </div>
                    </main>
                )}
            </div>

            {/* Add Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto my-auto relative animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Create New Task</h2>
                                <p className="text-xs text-gray-500 mt-1">Add a new item to your project's workflow.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask} className="space-y-6">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                                    Task Description
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="What needs to be done?"
                                    className="w-full px-4 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                                    value={newTaskName}
                                    onChange={(e) => setNewTaskName(e.target.value)}
                                />
                            </div>

                            {/* Side-by-side Priority & Due Date */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                                        Priority
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 cursor-pointer"
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(e.target.value as any)}
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 cursor-pointer"
                                        value={newDueDate}
                                        onChange={(e) => setNewDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newTaskName.trim()}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? 'Saving...' : 'Save Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Task Modal */}
            {editingTask && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto my-auto relative animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Edit Task</h2>
                                <p className="text-xs text-gray-500 mt-1">Update task properties, status, or assignee.</p>
                            </div>
                            <button
                                onClick={() => setEditingTask(null)}
                                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateTask} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Task Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Status
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 cursor-pointer"
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value as any)}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>

                            {/* Side-by-side Priority & Due Date */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                        Priority
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 cursor-pointer"
                                        value={editPriority}
                                        onChange={(e) => setEditPriority(e.target.value as any)}
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 cursor-pointer"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* RBAC UI Enforcement: Only Admins can assign tasks */}
                            {user?.role === 'ADMIN' && (
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                        Assign To
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="user@company.com"
                                        className="w-full px-4 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                                        value={editAssigneeEmail}
                                        onChange={(e) => setEditAssigneeEmail(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingTask(null)}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating || !editName.trim()}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUpdating ? 'Saving...' : 'Update Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invite Member Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto my-auto relative animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Invite Team Member</h2>
                                <p className="text-xs text-gray-500 mt-1">Add colleagues to collaborate on this project.</p>
                            </div>
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleInviteMember} className="space-y-6">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                                    Colleague Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="user@company.com"
                                    className="w-full px-4 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg text-sm shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(false)}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    Send Invite
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#18181b',
                        color: '#ffffff',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        fontSize: '13px',
                        fontWeight: 500,
                    },
                }}
            />
        </div>
    );
}
