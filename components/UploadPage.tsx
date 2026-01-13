import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Search,
    Folder,
    MoreVertical,
    Upload as UploadIcon,
    Plus,
    ChevronRight,
    ArrowUpDown,
    Filter,
    Music,
    Trash2,
    Edit,
    Info,
    FolderInput,
    FileText,
    X,
    Save,
    Play,
    Pause,
    Check,
    Copy,
    LayoutGrid,
    Columns,
    List,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Project, Track } from '../types';
import { uploadFile, deleteFile, getUserFiles, createFolder, updateAsset } from '../services/supabaseService';
import { MOCK_PROJECTS, MOCK_USER_PROFILE } from '../constants';

// --- Types ---
type FileType = 'folder' | 'audio' | 'text' | 'image';

interface FileSystemItem {
    id: string;
    parentId: string | null;
    name: string;
    type: FileType;
    size: string;
    created: string;
    format?: string;
    content?: string; // For text files
    src?: string;     // For audio mock
    duration?: number; // in seconds
}

interface ContextMenuState {
    x: number;
    y: number;
    type: 'file' | 'folder' | 'background';
    targetId?: string;
}

type ViewMode = 'grid' | 'column' | 'list';

interface UploadPageProps {
    onPlayTrack?: (project: Project, trackId: string) => void;
    onTogglePlay?: () => void;
    isPlaying?: boolean;
    currentTrackId?: string | null;
    currentProject?: Project | null;
    userProfile?: any | null; // Typed as any to avoid import cycle if needed, or better UserProfile
}

type FilterType = 'all' | 'audio' | 'image' | 'text' | 'folder';

// --- Initial Data ---
// Start with empty array for production
const INITIAL_ITEMS: FileSystemItem[] = [];

const UploadPage: React.FC<UploadPageProps> = ({ onPlayTrack, onTogglePlay, isPlaying, currentTrackId, currentProject, userProfile }) => {
    // File System State
    const [items, setItems] = useState<FileSystemItem[]>(INITIAL_ITEMS);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [selectedPath, setSelectedPath] = useState<string[]>([]); // For Column View: IDs of selected items in order

    // Set default view to grid on mobile
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setViewMode('grid');
        }
    }, []);

    // Interaction State
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [isDraggingFiles, setIsDraggingFiles] = useState(false);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [anchorSelectedId, setAnchorSelectedId] = useState<string | null>(null);

    // Modals State
    const [textEditorItem, setTextEditorItem] = useState<FileSystemItem | null>(null);
    const [infoItem, setInfoItem] = useState<FileSystemItem | null>(null);
    const [editorContent, setEditorContent] = useState('');

    // Filter State
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [noteSuccess, setNoteSuccess] = useState(false);
    const [isRenamingReady, setIsRenamingReady] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    // Focus rename input when active - with grace period
    useEffect(() => {
        if (renamingId) {
            setIsRenamingReady(false);
            if (renameInputRef.current) {
                const timer = setTimeout(() => {
                    renameInputRef.current?.focus();
                    renameInputRef.current?.select();
                    setIsRenamingReady(true);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [renamingId]);

    // --- Load Files on Mount ---
    useEffect(() => {
        const loadFiles = async () => {
            try {
                const dbFiles = await getUserFiles();
                const mappedFiles: FileSystemItem[] = dbFiles.map((f: any) => ({
                    id: f.id,
                    parentId: f.parentId || null,
                    name: f.name,
                    type: (f.type === 'folder') ? 'folder' : (f.type && f.type.startsWith('audio')) ? 'audio' : (f.type && f.type.startsWith('image')) ? 'image' : 'text',
                    size: f.size,
                    created: new Date().toLocaleDateString(), // TODO: use f.created_at
                    format: f.name.split('.').pop()?.toUpperCase(),
                    duration: 180, // detailed duration not yet available
                    src: f.url
                }));
                // Force state update with new files
                setItems(mappedFiles);
            } catch (error) {
                console.error("Failed to load files:", error);
            }
        };
        loadFiles();
    }, []);

    // --- File Upload Handler ---
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };



    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files);
        }
        // Reset input
        e.target.value = '';
    };

    // --- Derived State ---
    const currentItems = useMemo(() => {
        let filtered = items.filter(item => item.parentId === currentFolderId);

        if (activeFilter !== 'all') {
            filtered = filtered.filter(item => item.type === 'folder' || item.type === activeFilter);
        }

        return filtered;
    }, [items, currentFolderId, activeFilter]);
    const currentFolder = items.find(i => i.id === currentFolderId);

    // Close menu on outside click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // --- Actions ---

    // Helper to rebuild path from a folder ID upwards
    const getPathToRoot = (folderId: string | null): string[] => {
        if (!folderId) return [];
        const path: string[] = [];
        let current = items.find(i => i.id === folderId);
        // Safety break to prevent infinite loops in case of cycles (though shouldn't happen)
        let depth = 0;
        while (current && depth < 50) {
            path.unshift(current.id);
            if (!current.parentId) break;
            current = items.find(i => i.id === current.parentId);
            depth++;
        }
        return path;
    };

    const handleNavigate = (folderId: string | null) => {
        setCurrentFolderId(folderId);
        setContextMenu(null);
        setSelectedIds(new Set());
        setAnchorSelectedId(null);
        // Sync selectedPath for Column View consistency
        setSelectedPath(getPathToRoot(folderId));
    };

    const handleNavigateUp = () => {
        if (currentFolder) {
            const newParentId = currentFolder.parentId;
            setCurrentFolderId(newParentId);
            setSelectedIds(new Set());
            setAnchorSelectedId(null);
            setSelectedPath(getPathToRoot(newParentId));
        }
    };

    // --- Multi-Select Logic ---
    const handleItemClick = (item: FileSystemItem, e: React.MouseEvent) => {
        let newSelected = new Set(selectedIds);
        const currentId = item.id;

        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            // Range Selection (First ... Last)
            if (anchorSelectedId && currentItems.find(i => i.id === anchorSelectedId)) {
                const lastIdx = currentItems.findIndex(i => i.id === anchorSelectedId);
                const currIdx = currentItems.findIndex(i => i.id === currentId);

                if (lastIdx !== -1 && currIdx !== -1) {
                    const start = Math.min(lastIdx, currIdx);
                    const end = Math.max(lastIdx, currIdx);

                    const rangeItems = currentItems.slice(start, end + 1);
                    rangeItems.forEach(i => newSelected.add(i.id));
                }
            } else {
                newSelected.add(currentId);
            }
        } else {
            // Simple Click = Toggle (User request: "allow multi-select by just clicking")
            if (newSelected.has(currentId)) {
                newSelected.delete(currentId);
            } else {
                newSelected.add(currentId);
                setAnchorSelectedId(currentId); // Anchor for future range
            }
        }

        setSelectedIds(newSelected);
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedIds(new Set());
        }
    };

    // Create
    const handleCreateFolder = async () => {
        try {
            const newFolderData = await createFolder('New Folder', currentFolderId);

            const newFolder: FileSystemItem = {
                id: newFolderData.id,
                parentId: currentFolderId,
                name: newFolderData.name,
                type: 'folder',
                size: '-',
                created: newFolderData.created || new Date().toLocaleDateString()
            };

            setItems(prev => [...prev, newFolder]);
            setRenamingId(newFolder.id);
            setRenameValue(newFolder.name);
            setContextMenu(null);
            setSelectedIds(new Set([newFolder.id]));
        } catch (e) {
            console.error("Failed to create folder", e);
        }
    };

    const handleCreateTextFile = () => {
        const newFile: FileSystemItem = {
            id: `file-${Date.now()}`,
            parentId: currentFolderId,
            name: 'New Text.txt',
            type: 'text',
            size: '0 KB',
            created: new Date().toLocaleDateString(),
            content: ''
        };
        setItems([...items, newFile]);
        setRenamingId(newFile.id);
        setRenameValue(newFile.name);
        setTextEditorItem(newFile); // Open editor immediately
        setEditorContent('');
        setContextMenu(null);
        setSelectedIds(new Set([newFile.id]));
    };

    // Delete
    const handleDelete = async (targetId?: string) => {
        // If targetId is provided (from context menu), prioritize it.
        // If targetId is NOT provided, use selectedIds.
        // If targetId IS provided AND it is NOT in selectedIds, delete only targetId.
        // If targetId IS provided AND it IS in selectedIds, delete all selectedIds.

        let idsToDelete = new Set<string>();

        if (targetId) {
            if (selectedIds.has(targetId)) {
                idsToDelete = new Set(selectedIds);
            } else {
                idsToDelete = new Set([targetId]);
            }
        } else {
            idsToDelete = new Set(selectedIds);
        }

        if (idsToDelete.size === 0) return;

        // Recursive delete logic needs to be run for EACH id
        const finalIdsToDelete = new Set<string>();

        items.forEach(item => {
            if (idsToDelete.has(item.id)) {
                // Collect this and children
                const collect = (pid: string) => {
                    finalIdsToDelete.add(pid);
                    items.filter(child => child.parentId === pid).forEach(c => collect(c.id));
                };
                collect(item.id);
            }
        });

        // Delete from Supabase
        for (const itemId of Array.from(finalIdsToDelete)) {
            try {
                await deleteFile(itemId);
            } catch (e) {
                console.error('Failed to delete remote file', itemId, e);
            }
        }

        setItems(items.filter(i => !finalIdsToDelete.has(i.id)));
        setContextMenu(null);
        setSelectedIds(new Set()); // Clear selection
        setAnchorSelectedId(null);

        // Path cleanup?
        const remainingPath = selectedPath.filter(id => !finalIdsToDelete.has(id));
        if (remainingPath.length !== selectedPath.length) {
            setSelectedPath(remainingPath);
        }
    };

    // Rename
    const handleStartRename = (item: FileSystemItem) => {
        setRenamingId(item.id);
        setRenameValue(item.name);
        setContextMenu(null);
    };

    const handleFinishRename = async () => {
        if (renamingId) {
            try {
                // Optimistic update
                setItems(items.map(i => i.id === renamingId ? { ...i, name: renameValue } : i));

                // Persist logic
                if (!renamingId.startsWith('file-')) { // Skip local text files for now unless we add persistence for them
                    await updateAsset(renamingId, { name: renameValue });
                }
            } catch (e) {
                console.error("Failed to rename", e);
            }
            setRenamingId(null);
        }
    };

    // Playback - Integration with Global Player
    const handlePlay = (item: FileSystemItem) => {
        if (item.type !== 'audio') return;

        if (currentProject?.id === 'upload_browser_proj' && currentTrackId === item.id && onTogglePlay) {
            onTogglePlay();
            return;
        }

        if (onPlayTrack) {
            const folderFiles = items.filter(i => i.parentId === item.parentId && i.type === 'audio');

            // Use real user profile if available, otherwise mock
            const producerName = userProfile?.username || userProfile?.handle || 'Me';
            const producerAvatar = userProfile?.avatar || MOCK_USER_PROFILE.avatar;

            const tempProject: Project = {
                id: 'upload_browser_proj',
                title: 'Upload Browser',
                producer: producerName,
                producerAvatar: producerAvatar,
                coverImage: producerAvatar, // User avatar as cover for uploads
                price: 0,
                bpm: 0,
                key: '-',
                genre: 'Uploads',
                type: 'beat_tape',
                tags: ['Local'],
                tracks: folderFiles.map(f => ({
                    id: f.id,
                    title: f.name,
                    duration: f.duration || 180,
                    files: { mp3: f.src || '' } // Ensure src is populated
                })),
                created: new Date().toISOString()
            };

            onPlayTrack(tempProject, item.id);
        }
    };

    // Text Editor
    const openTextEditor = (item: FileSystemItem) => {
        setTextEditorItem(item);
        setEditorContent(item.content || '');
        setContextMenu(null);
    };

    const saveTextFile = () => {
        if (textEditorItem) {
            setItems(items.map(i => i.id === textEditorItem.id ? { ...i, content: editorContent, size: `${editorContent.length} B` } : i));
            setTextEditorItem(null);
        }
    };

    const addToNotes = () => {
        setNoteSuccess(true);
        setTimeout(() => setNoteSuccess(false), 2000);
    };

    // File Upload
    const handleFileUpload = async (files: FileList | File[]) => {
        setIsUploading(true);
        setUploadError(null);
        setUploadSuccess(null);

        const fileArray = Array.from(files);
        let successCount = 0;
        let failedFiles: string[] = [];
        let errors: string[] = [];


        try {
            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i];
                const fileId = `upload-${Date.now()}-${i}`;
                const progress = Math.round(((i + 1) / fileArray.length) * 100);

                // Update progress
                setUploadProgress(prev => ({ ...prev, [fileId]: progress }));

                try {
                    const result = await uploadFile(file);

                    // Create file item in UI
                    const fileType: FileType = file.type.startsWith('audio/') ? 'audio' :
                        file.type.startsWith('image/') ? 'image' :
                            file.type.startsWith('text/') ? 'text' : 'text';

                    const newFileItem: FileSystemItem = {
                        id: result.assetId,
                        parentId: currentFolderId,
                        name: file.name,
                        type: fileType,
                        size: formatFileSize(file.size),
                        created: new Date().toLocaleDateString(),
                        format: file.name.split('.').pop()?.toUpperCase(),
                        duration: fileType === 'audio' ? 180 : undefined, // Default duration for audio
                        src: result.publicUrl // Store the public URL
                    };

                    setItems(prev => [...prev, newFileItem]);
                    successCount++;

                } catch (error) {
                    console.error('Upload failed:', error);
                    failedFiles.push(file.name);

                    // Handle specific error types
                    if (error.message.includes('row-level security policy')) {
                        errors.push(`Storage bucket permissions not configured. Please create the "assets" bucket in your Supabase dashboard.`);
                    } else if (error.message.includes('Bucket not found')) {
                        errors.push(`Storage bucket "assets" doesn't exist. Please create it in Supabase Storage settings.`);
                    } else {
                        errors.push(`Failed to upload ${file.name}: ${error.message}`);
                    }
                }
            }

            if (successCount > 0) {
                const successMessage = `Successfully uploaded ${successCount} file(s)`;
                setUploadSuccess(successMessage);
                // Dispatch event to update storage bar in sidebar
                window.dispatchEvent(new CustomEvent('storage-updated'));
            }

            if (failedFiles.length > 0) {
                const uniqueErrors = [...new Set(errors)]; // Remove duplicates
                setUploadError(uniqueErrors.join(' '));
            }

        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = 'Upload failed. Please try again.';
            setUploadError(errorMessage);
        } finally {
            setIsUploading(false);
            setUploadProgress({});
        }
    };

    // Handle drag and drop from desktop
    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolderId(null);

        // Check if files are being dropped from desktop (not internal drag)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
            return;
        }

        // Internal drag and drop (moving items between folders)
        if (draggedItemId) {
            setItems(items.map(i => i.id === draggedItemId ? { ...i, parentId: null } : i));
            setDraggedItemId(null);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Info
    const openInfo = (item: FileSystemItem) => {
        setInfoItem(item);
        setContextMenu(null);
    };

    // Drag & Drop
    // Drag & Drop
    const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolderId(null);

        // Check if files are being dropped from desktop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
            return;
        }

        // Internal drag and drop (moving items between folders)
        if (draggedItemId && draggedItemId !== targetFolderId) {
            let itemsToMove: string[] = [];

            if (selectedIds.has(draggedItemId)) {
                // Moving selection
                itemsToMove = Array.from(selectedIds);
            } else {
                // Moving single item
                itemsToMove = [draggedItemId];
            }

            // Filter out the target folder itself if it's in the selection to prevent cycles
            itemsToMove = itemsToMove.filter(id => id !== targetFolderId);

            if (itemsToMove.length > 0) {
                // Optimistic update
                setItems(items.map(i => itemsToMove.includes(i.id) ? { ...i, parentId: targetFolderId } : i));
                setDraggedItemId(null);
                // Clear selection after move
                setSelectedIds(new Set());

                // Persist
                for (const id of itemsToMove) {
                    try {
                        await updateAsset(id, { parentId: targetFolderId });
                    } catch (e) {
                        console.error("Failed to move item", id, e);
                        // Revert optimistic update for this item? (Complex to handle partial failures, simplified for now)
                    }
                }
            }
        }
    };

    // Context Menu
    const handleContextMenu = (e: React.MouseEvent, type: 'file' | 'folder' | 'background', targetId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type, targetId });
    };

    // --- Column View Logic ---
    const getColumns = () => {
        const cols: { items: FileSystemItem[], selectedId: string | null }[] = [];

        // 1. Root Column
        cols.push({
            items: items.filter(i => i.parentId === null),
            selectedId: selectedPath[0] || null
        });

        // 2. Dynamic Columns based on Path
        for (let i = 0; i < selectedPath.length; i++) {
            const id = selectedPath[i];
            const item = items.find(x => x.id === id);

            // If selected item is a FOLDER, show its content in the next column
            if (item && item.type === 'folder') {
                cols.push({
                    items: items.filter(child => child.parentId === id),
                    selectedId: selectedPath[i + 1] || null
                });
            }
        }

        return cols;
    };

    const handleColumnItemClick = (item: FileSystemItem, depth: number) => {
        // Update path: truncate at depth, append new item
        const newPath = selectedPath.slice(0, depth);
        newPath.push(item.id);
        setSelectedPath(newPath);

        // Sync with currentFolderId for consistency actions (Create, Upload, etc.)
        if (item.type === 'folder') {
            setCurrentFolderId(item.id);
        } else {
            // If file, the context remains the parent of this file
            setCurrentFolderId(item.parentId);
        }
    };

    // Get selected file for info column
    const lastSelectedId = selectedPath[selectedPath.length - 1];
    const lastSelectedItem = items.find(i => i.id === lastSelectedId);

    return (
        <div
            className="w-full max-w-[1900px] mx-auto pb-12 pt-4 lg:pt-6 px-4 lg:px-10 xl:px-14 animate-in fade-in duration-500 min-h-[80vh]"
            onContextMenu={(e) => handleContextMenu(e, 'background')}
        >
            {/* Header & Breadcrumb */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 lg:mb-8">
                <div className="flex items-center space-x-2 text-sm font-medium">
                    {viewMode === 'grid' ? (
                        <>
                            <button
                                onClick={() => handleNavigate(null)}
                                className={`hover:text-white transition-colors ${!currentFolderId ? 'text-white font-bold' : 'text-neutral-400'}`}
                            >
                                All Files
                            </button>
                            {currentFolder && (
                                <>
                                    <ChevronRight size={14} className="text-neutral-600" />
                                    <span className="text-white font-bold">{currentFolder.name}</span>
                                </>
                            )}
                        </>
                    ) : (
                        <span className="text-white font-bold">Column Browser</span>
                    )}
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleCreateFolder}
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white transition-colors text-xs font-bold"
                    >
                        <Plus size={14} />
                        <span>New Folder</span>
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                    >
                        <UploadIcon size={14} />
                        <span>Upload Files</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="*"
                        onChange={handleFileInputChange}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 bg-neutral-900/30 border border-white/5 p-1.5 rounded-xl backdrop-blur-sm">
                <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-white pl-9 pr-4 py-2 placeholder-neutral-600"
                    />
                </div>

                <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center bg-neutral-900 rounded-lg border border-white/5 p-0.5">
                        {/* Mobile: List vs Grid */}
                        <button
                            onClick={() => setViewMode('list')}
                            className={`md:hidden p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        {/* Desktop: Grid vs Column */}
                        <button
                            onClick={() => setViewMode('column')}
                            className={`hidden md:block p-1.5 rounded-md transition-all ${viewMode === 'column' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            title="Column View"
                        >
                            <Columns size={16} />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-white/10"></div>

                    <button className="flex items-center space-x-2 px-3 py-1.5 rounded hover:bg-white/5 text-neutral-400 hover:text-white transition-colors text-xs font-mono border border-transparent hover:border-white/5">
                        <ArrowUpDown size={12} />
                        <span className="hidden md:inline">Sort: Date</span>
                        <span className="md:hidden">Date</span>
                    </button>
                </div>
            </div>

            {/* Mobile Filter Bar (Standardized Grid) */}
            <div className="lg:hidden relative pb-2 px-2 md:px-0">
                <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900/50 rounded-lg border border-white/5">
                    {(['all', 'audio', 'image', 'text'] as FilterType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setActiveFilter(type)}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeFilter === type ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <span className="text-[9px] font-bold uppercase tracking-tight">
                                {type === 'all' ? 'All' : type}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div
                className={`min-h-[500px] bg-[#050505] border rounded-xl overflow-hidden relative transition-all ${isDraggingFiles ? 'border-primary border-2 bg-primary/5' : 'border-white/5'}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    // Check if dragging files from desktop
                    if (e.dataTransfer.types.includes('Files')) {
                        setIsDraggingFiles(true);
                    }
                }}
                onDragLeave={(e) => {
                    // Only reset if leaving the container entirely
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setIsDraggingFiles(false);
                    }
                }}
                onDrop={(e) => {
                    setIsDraggingFiles(false);
                    handleDrop(e, currentFolderId);
                }}
                onClick={handleBackgroundClick} // Deselect on background click
            >
                {/* Drop Zone Overlay */}
                {isDraggingFiles && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl">
                        <div className="text-center">
                            <UploadIcon size={48} className="mx-auto mb-4 text-primary animate-bounce" />
                            <p className="text-lg font-bold text-white">Drop files to upload</p>
                            <p className="text-sm text-neutral-400">Release to upload your files</p>
                        </div>
                    </div>
                )}
                {currentItems.length === 0 ? (
                    <div
                        className={`flex flex-col items-center justify-center h-64 border border-dashed rounded-xl transition-all ${isDraggingFiles ? 'border-primary bg-primary/10' : 'border-neutral-800 text-neutral-600'}`}
                    >
                        <UploadIcon size={48} className={`mb-4 ${isDraggingFiles ? 'text-primary animate-bounce' : 'opacity-50'}`} />
                        <p className="text-sm font-bold">{isDraggingFiles ? 'Drop files here' : 'This folder is empty'}</p>
                        <p className="text-xs">{isDraggingFiles ? 'Release to upload your files' : 'Drag and drop files here or click Upload Files'}</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'list' && (
                            /* Mobile List View */
                            <div className="p-4 flex flex-col gap-2">
                                {/* FOLDERS */}
                                {currentItems.filter(i => i.type === 'folder').map(folder => {
                                    const isSelected = selectedIds.has(folder.id);
                                    return (
                                        <div
                                            key={folder.id}
                                            onClick={(e) => handleItemClick(folder, e)}
                                            onDoubleClick={() => handleNavigate(folder.id)}
                                            className={`
                                                flex items-center gap-4 p-4 rounded-xl active:scale-[0.98] transition-all border
                                                ${isSelected
                                                    ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                                                    : 'bg-neutral-900/50 border-white/5 hover:bg-neutral-900'
                                                }
                                            `}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNavigate(folder.id);
                                                }}
                                            >
                                                <Folder size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                                    {folder.name}
                                                </div>
                                                <div className="text-xs text-neutral-500 font-mono">{folder.size} items</div>
                                            </div>
                                            <ChevronRight size={16} className="text-neutral-600" />
                                        </div>
                                    );
                                })}

                                {/* FILES */}
                                {currentItems.filter(i => i.type !== 'folder').map(file => {
                                    const isPlayingFile = currentProject?.id === 'upload_browser_proj' && currentTrackId === file.id && isPlaying;
                                    const isSelected = selectedIds.has(file.id);

                                    return (
                                        <div
                                            key={file.id}
                                            className={`
                                                flex items-center gap-4 p-3 border rounded-xl transition-all
                                                ${isSelected
                                                    ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                                                    : 'bg-neutral-900/30 border-white/5'
                                                }
                                            `}
                                            onClick={(e) => handleItemClick(file, e)}
                                        >
                                            <div
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden cursor-pointer active:scale-95 transition-transform ${file.type === 'audio' ? (isPlayingFile ? 'bg-primary text-black animate-pulse' : 'bg-neutral-800/80 text-primary') :
                                                    file.type === 'image' ? 'bg-purple-500/20 text-purple-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (file.type === 'audio') handlePlay(file);
                                                    if (file.type === 'text') openTextEditor(file);
                                                    if (file.type === 'image') openInfo(file);
                                                }}
                                            >
                                                {file.type === 'audio' ? (isPlayingFile ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />) :
                                                    file.type === 'image' ? (
                                                        file.src ? (
                                                            <img src={file.src} className="w-full h-full object-cover" alt="" onError={(e) => {
                                                                (e.target as HTMLImageElement).src = ''; // Clear src on error to fallback to icon
                                                            }} />
                                                        ) : <LayoutGrid size={18} />
                                                    ) :
                                                        <FileText size={18} />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold text-sm truncate ${isPlayingFile || isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                                    {file.name}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] uppercase font-bold text-neutral-600 bg-white/5 px-1.5 py-0.5 rounded">{file.format || file.type}</span>
                                                    <span className="text-[10px] font-mono text-neutral-500">{file.size}</span>
                                                    {file.type === 'audio' && <span className="text-[10px] font-mono text-neutral-500">{Math.floor(file.duration! / 60)}:{(file.duration! % 60).toString().padStart(2, '0')}</span>}
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleContextMenu(e, 'file', file.id);
                                                }}
                                                className="p-2 text-neutral-600 hover:text-white"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {viewMode === 'grid' && (
                            /* Grid View - Now Visible on Mobile too */
                            <div className="p-3 md:p-6 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">

                                {/* FOLDERS */}
                                {currentItems.filter(i => i.type === 'folder').map(folder => {
                                    const isSelected = selectedIds.has(folder.id);
                                    return (
                                        <div
                                            key={folder.id}
                                            draggable
                                            onDragStart={() => setDraggedItemId(folder.id)}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
                                            onDragLeave={() => setDragOverFolderId(null)}
                                            onDrop={(e) => handleDrop(e, folder.id)}
                                            onClick={(e) => handleItemClick(folder, e)}
                                            onDoubleClick={() => handleNavigate(folder.id)}
                                            onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                                            className={`
                                     group p-4 bg-neutral-900/30 border rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative aspect-square
                                     ${isSelected
                                                    ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                                                    : 'border-transparent hover:bg-white/5 hover:scale-[1.02] hover:shadow-lg'
                                                }
                                     ${dragOverFolderId === folder.id
                                                    ? 'border-primary bg-primary/10 scale-105 shadow-[0_0_20px_rgba(var(--primary),0.2)]'
                                                    : ''
                                                }
                                 `}
                                        >
                                            <Folder
                                                size={32}
                                                className={`mb-3 transition-colors ${dragOverFolderId === folder.id || isSelected ? 'text-primary' : 'text-neutral-500 group-hover:text-white'}`}
                                            />
                                            {renamingId === folder.id ? (
                                                <input
                                                    autoFocus={window.innerWidth >= 768}
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onBlur={handleFinishRename}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                                                    className="w-full bg-black border border-primary text-white text-xs px-1 rounded text-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <div className={`text-xs font-bold text-center truncate w-full px-2 ${isSelected ? 'text-white' : 'group-hover:text-white text-neutral-300'}`}>{folder.name}</div>
                                            )}

                                            <button
                                                onClick={(e) => handleContextMenu(e, 'folder', folder.id)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-white"
                                            >
                                                <MoreVertical size={14} />
                                            </button>
                                        </div>
                                    )
                                })}

                                {/* FILES */}
                                {currentItems.filter(i => i.type !== 'folder').map(file => {
                                    const isPlayingFile = currentProject?.id === 'upload_browser_proj' && currentTrackId === file.id && isPlaying;
                                    const isSelected = selectedIds.has(file.id);

                                    return (
                                        <div
                                            key={file.id}
                                            draggable
                                            onDragStart={() => setDraggedItemId(file.id)}
                                            onClick={(e) => handleItemClick(file, e)}
                                            onDoubleClick={() => file.type === 'audio' ? handlePlay(file) : file.type === 'text' ? openTextEditor(file) : null}
                                            onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
                                            className={`
                                         group bg-neutral-900/30 border rounded-xl p-3 flex flex-col items-center relative select-none transition-all duration-200
                                         ${draggedItemId === file.id ? 'opacity-50 border-dashed' : ''}
                                         ${isSelected
                                                    ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                                                    : 'border-transparent'
                                                }
                                     `}
                                        >
                                            <div className="w-full aspect-square rounded-lg bg-neutral-900 flex items-center justify-center mb-3 relative overflow-hidden border border-white/5">
                                                {isPlayingFile ? (
                                                    <div
                                                        className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePlay(file);
                                                        }}
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black animate-pulse">
                                                            <Pause size={16} fill="black" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {file.type === 'audio' && <Music size={24} className={`transition-colors ${isSelected ? 'text-primary' : 'text-neutral-600 group-hover:text-neutral-400'}`} />}
                                                        {file.type === 'text' && <FileText size={24} className={`transition-colors ${isSelected ? 'text-white' : 'text-neutral-600 group-hover:text-neutral-400'}`} />}
                                                        {file.type === 'image' && (
                                                            <div className="w-full h-full relative group/img">
                                                                {file.src ? (
                                                                    <img
                                                                        src={file.src}
                                                                        className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110' : ''}`}
                                                                        alt={file.name}
                                                                    />
                                                                ) : (
                                                                    <LayoutGrid size={24} className="text-neutral-600" />
                                                                )}
                                                                <div className="absolute inset-0 bg-black/20 group-hover/img:bg-black/0 transition-colors" />
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {file.type === 'audio' && !isPlayingFile && (
                                                    <div
                                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                                                        onClick={(e) => { e.stopPropagation(); handlePlay(file); }}
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
                                                            <Play size={14} fill="black" className="ml-0.5" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {renamingId === file.id ? (
                                                <input
                                                    autoFocus={window.innerWidth >= 768}
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onBlur={handleFinishRename}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                                                    className="w-full bg-black border border-primary text-white text-xs px-1 rounded text-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <div className={`text-[11px] md:text-xs font-bold text-center truncate w-full px-1 ${isPlayingFile || isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                                                    {file.name}
                                                </div>
                                            )}

                                            <div className="text-[10px] text-neutral-600 mt-1">{file.size}</div>

                                            <button
                                                onClick={(e) => handleContextMenu(e, 'file', file.id)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white p-1 bg-black/50 rounded hover:bg-black/70"
                                            >
                                                <MoreVertical size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {viewMode === 'column' && (
                    // --- COLUMN VIEW ---
                    <div className="flex h-[600px] overflow-x-auto custom-scrollbar divide-x divide-white/5">
                        {(() => {
                            const allColumns = getColumns();
                            const MAX_NAV_COLS = 4;
                            const startIndex = Math.max(0, allColumns.length - MAX_NAV_COLS);
                            const visibleColsLines = allColumns.slice(startIndex);

                            // Pad with empty columns if needed
                            const displayCols = [...visibleColsLines];
                            while (displayCols.length < MAX_NAV_COLS) {
                                displayCols.push({ items: [], selectedId: null });
                            }

                            return displayCols.map((col, i) => {
                                const realIndex = startIndex + i;

                                return (
                                    <div key={i} className="flex-1 min-w-[200px] overflow-y-auto custom-scrollbar bg-neutral-900/20 relative border-r border-white/5 last:border-r-0">
                                        {col.items.length === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center text-neutral-800 pointer-events-none">
                                                <span className="text-xs font-mono opacity-20">Column {i + 1}</span>
                                            </div>
                                        )}
                                        {col.items.map(item => {
                                            const isSelected = col.selectedId === item.id;
                                            const isPlayingFile = currentProject?.id === 'upload_browser_proj' && currentTrackId === item.id && isPlaying;
                                            const isDropTarget = dragOverFolderId === item.id;

                                            return (
                                                <div
                                                    key={item.id}
                                                    draggable
                                                    onDragStart={() => setDraggedItemId(item.id)}
                                                    onDragOver={(e) => {
                                                        if (item.type === 'folder') {
                                                            e.preventDefault();
                                                            setDragOverFolderId(item.id);
                                                        }
                                                    }}
                                                    onDragLeave={() => setDragOverFolderId(null)}
                                                    onDrop={(e) => {
                                                        if (item.type === 'folder') {
                                                            handleDrop(e, item.id);
                                                        }
                                                    }}
                                                    onClick={() => handleColumnItemClick(item, realIndex)}
                                                    onContextMenu={(e) => handleContextMenu(e, item.type === 'folder' ? 'folder' : 'file', item.id)}
                                                    className={`
                                                    flex items-center gap-2 px-4 py-2 text-sm cursor-pointer whitespace-nowrap border-b border-white/5
                                                    ${isSelected ? 'bg-primary text-black font-bold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}
                                                    ${isPlayingFile && !isSelected ? 'text-primary' : ''}
                                                    ${isDropTarget ? 'bg-primary/20 ring-2 ring-inset ring-primary' : ''}
                                                `}
                                                >
                                                    {item.type === 'folder' ? (
                                                        <Folder size={14} className={isSelected ? 'text-black' : 'text-neutral-500'} />
                                                    ) : item.type === 'audio' ? (
                                                        <Music size={14} className={isSelected ? 'text-black' : 'text-neutral-500'} />
                                                    ) : (
                                                        <FileText size={14} className={isSelected ? 'text-black' : 'text-neutral-500'} />
                                                    )}

                                                    {renamingId === item.id ? (
                                                        <input
                                                            autoFocus={window.innerWidth >= 768}
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onBlur={handleFinishRename}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                                                            className={`
                                                                flex-1 bg-transparent border-none outline-none text-sm px-0 py-0
                                                                ${isSelected ? 'text-black placeholder:text-black/50 selection:bg-neutral-900 selection:text-white' : 'text-white placeholder:text-neutral-500 selection:bg-primary selection:text-black'}
                                                            `}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <span className="truncate flex-1">{item.name}</span>
                                                    )}

                                                    {item.type === 'folder' && <ChevronRight size={12} className={isSelected ? 'text-black' : 'text-neutral-600'} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            });
                        })()}

                        {/* Preview Column (Always Visible - Last in Flex) */}
                        <div className="w-80 flex-shrink-0 bg-[#080808] p-8 flex flex-col items-center text-center overflow-y-auto custom-scrollbar border-l border-white/10">
                            {lastSelectedItem ? (
                                <>
                                    <div className="w-32 h-32 bg-neutral-900 rounded-2xl border border-white/10 flex items-center justify-center mb-6 shadow-2xl relative">
                                        {lastSelectedItem.type === 'audio' ? (
                                            <Music size={48} className="text-neutral-600" />
                                        ) : lastSelectedItem.type === 'folder' ? (
                                            <Folder size={48} className="text-neutral-600" />
                                        ) : lastSelectedItem.type === 'image' && lastSelectedItem.src ? (
                                            <img src={lastSelectedItem.src} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <FileText size={48} className="text-neutral-600" />
                                        )}

                                        {lastSelectedItem.type === 'audio' && (
                                            <button
                                                onClick={() => handlePlay(lastSelectedItem)}
                                                className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                            >
                                                {(currentProject?.id === 'upload_browser_proj' && currentTrackId === lastSelectedItem.id && isPlaying)
                                                    ? <Pause size={20} fill="black" />
                                                    : <Play size={20} fill="black" />
                                                }
                                            </button>
                                        )}
                                    </div>

                                    {renamingId === lastSelectedItem.id ? (
                                        <input
                                            ref={renameInputRef}
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={() => isRenamingReady && handleFinishRename()}
                                            onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                                            className="w-full bg-black border border-primary text-xl font-bold text-white mb-2 text-center rounded px-2 focus:outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <h3
                                            className="text-xl font-bold text-white mb-2 break-all cursor-text hover:text-gray-300 transition-colors select-none"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                handleStartRename(lastSelectedItem);
                                            }}
                                            title="Double click to rename"
                                        >
                                            {lastSelectedItem.name}
                                        </h3>
                                    )}
                                    <p className="text-sm text-neutral-500 font-mono mb-6">{lastSelectedItem.size} • {lastSelectedItem.format || lastSelectedItem.type.toUpperCase()}</p>

                                    <div className="w-full space-y-4">
                                        <div className="bg-white/5 rounded-lg p-4 text-left">
                                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-2">Information</div>
                                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                                                <span className="text-neutral-400">Created</span>
                                                <span className="text-white text-right">{lastSelectedItem.created}</span>
                                                <span className="text-neutral-400">Type</span>
                                                <span className="text-white text-right capitalized">{lastSelectedItem.type}</span>
                                                {lastSelectedItem.duration && (
                                                    <>
                                                        <span className="text-neutral-400">Duration</span>
                                                        <span className="text-white text-right">{Math.floor(lastSelectedItem.duration / 60)}:{(lastSelectedItem.duration % 60).toString().padStart(2, '0')}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors">
                                            Download File
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-600">
                                    <Info size={48} className="mb-4 opacity-50" />
                                    <p className="text-sm font-bold">No Item Selected</p>
                                    <p className="text-xs opacity-70">Select a file or folder to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Upload Progress and Messages - Redesigned */}
                {isUploading && (
                    <div className="fixed bottom-6 right-0 left-0 mx-4 md:left-auto md:mx-0 md:right-6 z-50 md:w-96 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                                    <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping opacity-75"></div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">Uploading Files</h4>
                                    <p className="text-[10px] text-neutral-400">{Object.keys(uploadProgress).length} file(s) in queue</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {Object.entries(uploadProgress).map(([fileId, progress]) => (
                                <div key={fileId} className="p-3 mb-1 rounded-xl bg-neutral-900/50 border border-transparent hover:border-white/5 transition-colors group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                                                {fileId.includes('audio') ? <Music size={14} className="text-neutral-400" /> : <FileText size={14} className="text-neutral-400" />}
                                            </div>
                                            <span className="text-xs font-medium text-neutral-300 truncate">File {fileId.split('-').pop()}</span>
                                        </div>
                                        <span className="text-xs font-bold text-primary">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-neutral-800 rounded-full h-1 overflow-hidden">
                                        <div
                                            className="bg-primary h-full rounded-full transition-all duration-300 ease-out relative"
                                            style={{ width: `${progress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(uploadError || uploadSuccess) && !isUploading && (
                    <div className="fixed bottom-6 right-0 left-0 mx-4 md:left-auto md:mx-0 md:right-6 z-50 md:w-96 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        {uploadError && (
                            <div className="bg-[#1a0505] border border-red-500/20 rounded-2xl shadow-2xl overflow-hidden">
                                <div className="p-4 flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 border border-red-500/20">
                                        <AlertCircle size={20} className="text-red-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-red-100 mb-1">Upload Failed</h4>
                                        <p className="text-xs text-red-200/70 leading-relaxed mb-3">
                                            {uploadError.includes('row-level security policy')
                                                ? "Permission denied. Please ensure you are logged in and have the correct access rights."
                                                : uploadError}
                                        </p>

                                        {uploadError.includes('row-level security policy') && (
                                            <div className="space-y-2">
                                                <div className="px-3 py-2 bg-red-500/5 rounded-lg border border-red-500/10">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Info size={12} className="text-red-400" />
                                                        <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">Troubleshooting</span>
                                                    </div>
                                                    <p className="text-[10px] text-red-400/80">
                                                        The storage bucket "assets" might be missing or private.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setUploadError(null)}
                                                    className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        )}

                                        {!uploadError.includes('row-level security policy') && (
                                            <button
                                                onClick={() => setUploadError(null)}
                                                className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors mt-1"
                                            >
                                                Dismiss
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={() => setUploadError(null)} className="text-red-400/50 hover:text-red-400 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {uploadSuccess && (
                            <div className="bg-[#051a05] border border-green-500/20 rounded-2xl shadow-2xl overflow-hidden p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 border border-green-500/20">
                                    <Check size={20} className="text-green-500" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-green-100">Upload Complete</h4>
                                    <p className="text-xs text-green-200/70">{uploadSuccess}</p>
                                </div>
                                <button onClick={() => setUploadSuccess(null)} className="text-green-400/50 hover:text-green-400 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* TEXT EDITOR MODAL */}
            {textEditorItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
                    <div className="w-full h-full md:h-auto md:max-w-2xl bg-[#0a0a0a] border-0 md:border border-neutral-700 rounded-none md:rounded-xl shadow-2xl flex flex-col max-h-none md:max-h-[80vh]">
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-neutral-900/50">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-primary" />
                                <span className="text-sm font-bold text-white">{textEditorItem.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={addToNotes}
                                    className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all
                                    ${noteSuccess ? 'bg-green-500/20 text-green-400' : 'bg-white/5 hover:bg-white/10 text-neutral-300'}
                                `}
                                >
                                    {noteSuccess ? <Check size={14} /> : <Copy size={14} />}
                                    {noteSuccess ? 'Saved to Notebook' : 'Add to Notes'}
                                </button>
                                <button onClick={() => setTextEditorItem(null)} className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.value)}
                            className="flex-1 bg-[#050505] p-6 text-sm text-neutral-300 font-mono focus:outline-none resize-none"
                            placeholder="Start typing..."
                        />
                        <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                            <button onClick={() => setTextEditorItem(null)} className="px-4 py-2 rounded text-xs font-bold text-neutral-500 hover:text-white">Cancel</button>
                            <button onClick={saveTextFile} className="px-4 py-2 bg-primary text-black rounded text-xs font-bold hover:bg-primary/90 flex items-center gap-2">
                                <Save size={14} /> Save File
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INFO MODAL */}
            {infoItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-700 rounded-xl shadow-2xl p-6 relative">
                        <button onClick={() => setInfoItem(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
                            <X size={16} />
                        </button>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-20 h-20 bg-neutral-900 rounded-2xl border border-white/10 flex items-center justify-center mb-4 shadow-lg">
                                {infoItem.type === 'folder' ? <Folder size={40} className="text-primary" /> : infoItem.type === 'text' ? <FileText size={40} className="text-neutral-400" /> : <Music size={40} className="text-neutral-400" />}
                            </div>
                            <h3 className="text-lg font-bold text-white">{infoItem.name}</h3>
                            <span className="text-xs text-neutral-500 font-mono uppercase">{infoItem.type}</span>
                        </div>

                        <div className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Size</span>
                                <span className="text-white font-mono">{infoItem.size}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Created</span>
                                <span className="text-white font-mono">{infoItem.created}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Format</span>
                                <span className="text-white font-mono">{infoItem.format || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Location</span>
                                <span className="text-white font-mono">{infoItem.parentId ? 'Subfolder' : 'Root'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTEXT MENU */}
            {contextMenu && (
                <div
                    ref={menuRef}
                    className="fixed z-[100] w-48 bg-[#0a0a0a] border border-neutral-700 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-lg py-1.5 text-xs font-medium backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 origin-top-left"
                    style={{
                        top: Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 0) - 220), // Prevent bottom overflow
                        left: contextMenu.x > (typeof window !== 'undefined' ? window.innerWidth : 0) - 200
                            ? 'auto'
                            : contextMenu.x,
                        right: contextMenu.x > (typeof window !== 'undefined' ? window.innerWidth : 0) - 200
                            ? (typeof window !== 'undefined' ? window.innerWidth : 0) - contextMenu.x
                            : 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* FILE CONTEXT MENU */}
                    {contextMenu.type === 'file' && (
                        <>
                            <div className="px-2 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider opacity-50 mb-1">
                                {items.find(i => i.id === contextMenu.targetId)?.name}
                            </div>
                            {items.find(i => i.id === contextMenu.targetId)?.type === 'audio' && (
                                <ContextMenuItem icon={<Play size={14} />} label="Play" onClick={() => { handlePlay(items.find(i => i.id === contextMenu.targetId)!); setContextMenu(null); }} />
                            )}
                            {items.find(i => i.id === contextMenu.targetId)?.type === 'text' && (
                                <ContextMenuItem icon={<Edit size={14} />} label="Edit Text" onClick={() => { openTextEditor(items.find(i => i.id === contextMenu.targetId)!); }} />
                            )}

                            <ContextMenuItem icon={<Copy size={14} />} label="Copy Link" />
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            <ContextMenuItem icon={<Edit size={14} />} label="Rename" onClick={() => handleStartRename(items.find(i => i.id === contextMenu.targetId)!)} />
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            <ContextMenuItem icon={<Info size={14} />} label="Get Info" onClick={() => openInfo(items.find(i => i.id === contextMenu.targetId)!)} />
                            <ContextMenuItem icon={<Trash2 size={14} />} label="Delete" className="text-red-400 hover:bg-red-500/10 hover:text-red-400" onClick={() => handleDelete(contextMenu.targetId!)} />
                        </>
                    )}

                    {/* FOLDER CONTEXT MENU */}
                    {contextMenu.type === 'folder' && (
                        <>
                            <div className="px-2 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider opacity-50 mb-1">
                                Folder Actions
                            </div>
                            <ContextMenuItem icon={<Folder size={14} />} label="Open" onClick={() => handleNavigate(contextMenu.targetId!)} />
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            <ContextMenuItem icon={<Edit size={14} />} label="Rename" onClick={() => handleStartRename(items.find(i => i.id === contextMenu.targetId)!)} />
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            <ContextMenuItem icon={<Info size={14} />} label="Get Info" onClick={() => openInfo(items.find(i => i.id === contextMenu.targetId)!)} />
                            <ContextMenuItem icon={<Trash2 size={14} />} label="Delete" className="text-red-400 hover:bg-red-500/10 hover:text-red-400" onClick={() => handleDelete(contextMenu.targetId!)} />
                        </>
                    )}

                    {/* BACKGROUND CONTEXT MENU */}
                    {contextMenu.type === 'background' && (
                        <>
                            <ContextMenuItem icon={<Folder size={14} />} label="New Folder" onClick={handleCreateFolder} />
                            <ContextMenuItem icon={<FileText size={14} />} label="New Text File" onClick={handleCreateTextFile} />
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            <ContextMenuItem icon={<UploadIcon size={14} />} label="Upload Files" />
                            {currentFolderId && (
                                <ContextMenuItem icon={<CornerDownLeft size={14} />} label="Back Up" onClick={handleNavigateUp} />
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Toast Notifications - REMOVED */}
        </div>
    );
};

interface ContextMenuItemProps {
    icon: React.ReactNode;
    label: string;
    className?: string;
    onClick?: () => void;
}

const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ icon, label, className, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 transition-colors text-left ${className || 'text-neutral-300 hover:text-white'}`}
    >
        <span className="opacity-70">{icon}</span>
        <span>{label}</span>
    </button>
)

// Helper icon for back navigation in context menu
const CornerDownLeft = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
);

export default UploadPage;