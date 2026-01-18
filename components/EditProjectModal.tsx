import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Trash2, Music2, Tag } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { deleteProject } from '../services/supabaseService';

interface EditProjectModalProps {
    project: Project;
    onClose: () => void;
    onSave: (updates: Partial<Project>) => Promise<void>;
    onDelete?: (projectId: string) => Promise<void>;
}

const GENRES = ["Trap", "Boom Bap", "R&B", "Drill", "Lofi", "Afrobeat", "Pop", "Electronic", "Rock"];
const SUB_GENRES = ["Dark", "Melodic", "Hard", "Chill", "Guitar", "Piano", "Soulful", "Upbeat", "Sad"];

const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState(project.title);
    const [description, setDescription] = useState(project.description || '');
    const [genre, setGenre] = useState(project.genre || '');
    const [subGenre, setSubGenre] = useState(project.subGenre || '');

    // Status can be toggled if needed, but per request, public projects use the full creation window.
    // This modal is mainly for library/private/drafts which have "limited options".

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                title,
                description,
                genre,
                subGenre
            });
            handleClose();
        } catch (e) {
            console.error(e);
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setDeleting(true);
        try {
            // If onDelete is provided by parent, use it (which updates local state)
            await onDelete(project.id);
            // OR if strictly using service here:
            // await deleteProject(project.id); 
            // BUT parent state update is needed, so rely on onDelete prop if possible.

            handleClose();
        } catch (e) {
            console.error("Failed to delete project", e);
            setDeleting(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center`}>
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={handleClose}></div>

            <div
                className={`
                    relative w-full h-full md:h-auto md:max-w-md bg-[#0a0a0a] md:rounded-2xl border-t md:border border-white/10 
                    shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh] transition-transform duration-300 ease-out will-change-transform
                    ${isVisible ? 'translate-y-0' : 'translate-y-full'}
                `}
                onClick={e => e.stopPropagation()}
            >
                {/* Header Actions */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-neutral-900/50">
                    <button
                        onClick={handleClose}
                        className="text-neutral-400 hover:text-white px-2 py-2 text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <span className="font-bold text-white text-sm">Edit Details</span>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-primary font-bold px-2 py-2 text-sm disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase">Title</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 focus:outline-none"
                                placeholder="Project Title"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 focus:outline-none resize-none text-sm"
                                placeholder="Add a description..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <CustomDropdown
                                label="Genre"
                                value={genre}
                                onChange={setGenre}
                                options={GENRES}
                                placeholder="Select Genre"
                                searchable
                            />
                            <CustomDropdown
                                label="Sub-Genre"
                                value={subGenre}
                                onChange={setSubGenre}
                                options={SUB_GENRES}
                                placeholder="Select Sub-Genre"
                                searchable
                            />
                        </div>
                    </div>

                    {/* Delete Section */}
                    <div className="pt-6 border-t border-white/5">
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 size={16} />
                                Delete Project
                            </button>
                        ) : (
                            <div className="space-y-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4 animate-in fade-in zoom-in-95">
                                <p className="text-red-200 text-xs text-center font-medium">Are you sure? This cannot be undone.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-2 bg-black/40 text-white text-xs font-bold rounded hover:bg-black/60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                                    >
                                        {deleting ? 'Deleting...' : 'Confirm Delete'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProjectModal;
