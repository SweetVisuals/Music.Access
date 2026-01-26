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
    Loader2,
    CornerUpLeft
} from 'lucide-react';
import { Project, Track } from '../types';
import { uploadFile, deleteFile, getUserFiles, createFolder, updateAsset } from '../services/supabaseService';
import { MOCK_PROJECTS, MOCK_USER_PROFILE } from '../constants';

import { useFileOperation } from '../contexts/FileOperationContext';

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
    const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);

    // Modals State
    const [textEditorItem, setTextEditorItem] = useState<FileSystemItem | null>(null);
    const [infoItem, setInfoItem] = useState<FileSystemItem | null>(null);
    const [editorContent, setEditorContent] = useState('');

    // Filter State
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Filter State


    // Global File Operation Hook
    const { uploadFiles, deleteFiles, moveFiles } = useFileOperation();

    const [noteSuccess, setNoteSuccess] = useState(false);
    const [isRenamingReady, setIsRenamingReady] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const columnContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest column
    useEffect(() => {
        if (viewMode === 'column' && columnContainerRef.current) {
            // Small timeout to ensure DOM has updated with new column
            setTimeout(() => {
                if (columnContainerRef.current) {
                    columnContainerRef.current.scrollTo({
                        left: columnContainerRef.current.scrollWidth,
                        behavior: 'smooth'
                    });
                }
            }, 50);
        }
    }, [selectedPath, viewMode]);

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

    // --- Mobile DnD State ---
    const [touchDragItem, setTouchDragItem] = useState<{ id: string, x: number, y: number } | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPositionRef = useRef<{ x: number, y: number } | null>(null);
    const touchedElementRef = useRef<HTMLElement | null>(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        };
    }, []);

    // Ref to access current state in event listeners without deep dependencies
    const stateRef = useRef({
        items,
        selectedIds,
        dragOverFolderId,
        touchDragItem,
        moveFiles
    });

    useEffect(() => {
        stateRef.current = {
            items,
            selectedIds,
            dragOverFolderId,
            touchDragItem,
            moveFiles
        };
    }, [items, selectedIds, dragOverFolderId, touchDragItem, moveFiles]);

    // Global Touch Move & End Handlers for Active Drag
    useEffect(() => {
        if (!touchDragItem) return;

        const handleGlobalTouchMove = (e: TouchEvent) => {
            // CRITICAL: Prevent scrolling while dragging
            if (e.cancelable) e.preventDefault();

            const touch = e.touches[0];
            const { touchDragItem: currentDragItem } = stateRef.current;

            // Update ghost position
            setTouchDragItem(prev => prev ? ({ ...prev, x: touch.clientX, y: touch.clientY }) : null);

            // Hit testing
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const folderElement = target?.closest('[data-folder-id]');

            if (folderElement) {
                const folderId = folderElement.getAttribute('data-folder-id');
                // Ensure we don't drop into ourselves
                if (folderId && currentDragItem && folderId !== currentDragItem.id) {
                    setDragOverFolderId(folderId);
                } else {
                    setDragOverFolderId(null);
                }
            } else {
                setDragOverFolderId(null);
            }
        };

        const handleGlobalTouchEnd = (e: TouchEvent) => {
            const { dragOverFolderId, touchDragItem, selectedIds, items, moveFiles } = stateRef.current;

            if (touchDragItem && dragOverFolderId) {
                const targetFolderId = dragOverFolderId;
                if (touchDragItem.id !== targetFolderId) {
                    // Logic replicated from moveFileInternal to use captured state
                    let itemsToMove: string[] = [];
                    if (selectedIds.has(touchDragItem.id)) {
                        itemsToMove = Array.from(selectedIds);
                    } else {
                        itemsToMove = [touchDragItem.id];
                    }
                    itemsToMove = itemsToMove.filter(id => id !== targetFolderId);

                    if (itemsToMove.length > 0) {
                        const itemsMap = new Map();
                        items.forEach(i => itemsMap.set(i.id, i));

                        // Optimistic Update
                        setItems(prevItems => prevItems.map(i => itemsToMove.includes(i.id) ? { ...i, parentId: targetFolderId } : i));
                        setSelectedIds(new Set());

                        // Trigger Global Operation
                        moveFiles(itemsToMove, targetFolderId, itemsMap);
                    }
                }
            }

            // Cleanup
            setTouchDragItem(null);
            setIsDraggingFiles(false);
            setDragOverFolderId(null);
        };

        // Attach non-passive listener for move to allow prevention of default (scrolling)
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd);
        document.addEventListener('touchcancel', handleGlobalTouchEnd);

        return () => {
            document.removeEventListener('touchmove', handleGlobalTouchMove);
            document.removeEventListener('touchend', handleGlobalTouchEnd);
            document.removeEventListener('touchcancel', handleGlobalTouchEnd);
        };
    }, [!!touchDragItem]); // Only bind/unbind when drag state toggles


    const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
        // Only allow primary single touch
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };
        touchedElementRef.current = e.currentTarget as HTMLElement;

        // Start long press timer
        longPressTimerRef.current = setTimeout(() => {
            // Initiate Drag Mode
            if (window.navigator.vibrate) window.navigator.vibrate(50); // Haptic feedback
            setTouchDragItem({
                id: itemId,
                x: touch.clientX,
                y: touch.clientY
            });
            setDraggedItemId(itemId); // Sync with main dnd state logic
        }, 500); // 500ms long press
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];

        // Logic handled by global listener if dragging
        if (!touchDragItem) {
            // Not dragging yet, checking if we should cancel timer (user scrolled)
            if (touchStartPositionRef.current) {
                const diffX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
                const diffY = Math.abs(touch.clientY - touchStartPositionRef.current.y);

                if (diffX > 10 || diffY > 10) {
                    // Movement detected, cancel long press
                    if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                }
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        // Just cleanup timer if we didn't start dragging
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        // Drop logic is handled by global listener
    };

    // Extracted from handleDrop for reuse - using Global Context
    const moveFileInternal = async (sourceId: string, targetId: string) => {
        let itemsToMove: string[] = [];
        if (selectedIds.has(sourceId)) {
            itemsToMove = Array.from(selectedIds);
        } else {
            itemsToMove = [sourceId];
        }
        itemsToMove = itemsToMove.filter(id => id !== targetId);

        if (itemsToMove.length > 0) {
            // Create a map for the context to look up item names
            const itemsMap = new Map();
            items.forEach(i => itemsMap.set(i.id, i));

            // Optimistic Update Locally
            setItems(prevItems => prevItems.map(i => itemsToMove.includes(i.id) ? { ...i, parentId: targetId } : i));
            setSelectedIds(new Set());

            // Trigger Global Operation
            moveFiles(itemsToMove, targetId, itemsMap);
        }
    };


    // --- Load Files on Mount ---
    // --- Load Files on Mount & Listen for Updates ---
    // --- Load Files on Mount & Listen for Updates ---
    const getAudioDuration = (url: string): Promise<number> => {
        return new Promise((resolve) => {
            const audio = new Audio(url);
            audio.onloadedmetadata = () => resolve(audio.duration);
            audio.onerror = () => resolve(0); // Fail silently
        });
    };

    const loadFiles = async () => {
        try {
            const dbFiles = await getUserFiles();

            // Map initial structure
            const mappedFilesPromise = dbFiles.map(async (f: any) => {
                let duration = 180; // Default fallback
                const isAudio = f.type && f.type.startsWith('audio');

                // Try to calc duration if audio
                if (isAudio && f.url) {
                    try {
                        const d = await getAudioDuration(f.url);
                        if (d > 0) duration = Math.round(d);
                    } catch (e) {
                        // ignore
                    }
                }

                return {
                    id: f.id,
                    parentId: f.parentId || null,
                    name: f.name,
                    type: (f.type === 'folder') ? 'folder' : (isAudio) ? 'audio' : (f.type && f.type.startsWith('image')) ? 'image' : 'text',
                    size: f.size,
                    created: new Date().toLocaleDateString(), // TODO: use f.created_at
                    format: f.name.split('.').pop()?.toUpperCase(),
                    duration: duration,
                    src: f.url
                } as FileSystemItem;
            });

            const mappedFiles = await Promise.all(mappedFilesPromise);

            // Force state update with new files
            setItems(mappedFiles);
        } catch (error) {
            console.error("Failed to load files:", error);
        }
    };

    useEffect(() => {
        loadFiles();

        const handleStorageUpdate = () => {
            loadFiles();
        };

        window.addEventListener('storage-updated', handleStorageUpdate);
        return () => window.removeEventListener('storage-updated', handleStorageUpdate);
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
    const handleDelete = async () => {
        if (!selectedIds.size && !contextMenu?.targetId) return;

        const idsToDelete = new Set<string>();
        if (contextMenu?.targetId) {
            idsToDelete.add(contextMenu.targetId);
        } else {
            selectedIds.forEach(id => idsToDelete.add(id));
        }

        if (idsToDelete.size === 0) return;

        // Global Delete Operation
        const itemsMap = new Map();
        items.forEach(i => itemsMap.set(i.id, i));

        // Optimistic UI Update - Remove immediately
        setItems(prevItems => prevItems.filter(i => !idsToDelete.has(i.id)));

        // Trigger Global Delete
        deleteFiles(Array.from(idsToDelete), itemsMap);

        setContextMenu(null);
        setSelectedIds(new Set()); // Clear selection
        setAnchorSelectedId(null);

        // Path cleanup
        const remainingPath = selectedPath.filter(id => !idsToDelete.has(id));
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
    const handleFileUpload = async (files: FileList | File[], targetIdOverride?: string | null) => {
        const fileArray = Array.from(files);
        if (fileArray.length === 0) return;

        // Determine target folder: override takes precedence, otherwise current active folder
        const uploadTargetId = targetIdOverride !== undefined ? targetIdOverride : currentFolderId;

        // Use Global Context for Upload
        // The context handles notifications and state.
        // We just need to trigger it.
        // The 'storage-updated' event listener will handle refreshing the file list when done.

        await uploadFiles(fileArray, uploadTargetId);
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
    // Drag & Drop
    const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolderId(null);

        // Check if files are being dropped from desktop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files, targetFolderId);
            return;
        }

        // Internal drag and drop (moving items between folders)
        if (draggedItemId && draggedItemId !== targetFolderId) {
            // Check if we're moving to the same folder
            const draggedItem = items.find(i => i.id === draggedItemId);
            if (draggedItem && draggedItem.parentId === targetFolderId) {
                return;
            }

            let itemsToMove: string[] = [];

            if (selectedIds.has(draggedItemId)) {
                // Moving selection
                itemsToMove = Array.from(selectedIds);
            } else {
                // Moving single item
                itemsToMove = [draggedItemId];
            }

            // Filter out the target folder itself
            itemsToMove = itemsToMove.filter(id => id !== targetFolderId);

            if (itemsToMove.length > 0) {
                // Use Global Context for Move
                const itemsMap = new Map(items.map(i => [i.id, i]));
                await moveFiles(itemsToMove, targetFolderId, itemsMap);

                // Clear selection & drag state
                setSelectedIds(new Set());
                setDraggedItemId(null);
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

    const handleColumnItemClick = (item: FileSystemItem, depth: number, e: React.MouseEvent) => {
        // Handle Multi-Select Logic for Column View
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            e.preventDefault();
            let newSelected = new Set(selectedIds);
            const currentId = item.id;
            const currentColumnItems = getColumns()[depth]?.items || [];

            if (e.shiftKey) {
                // Check if we have a valid anchor in THIS column
                const anchorInColumn = anchorSelectedId && currentColumnItems.find(i => i.id === anchorSelectedId);

                if (anchorInColumn) {
                    // Range Selection
                    const lastIdx = currentColumnItems.findIndex(i => i.id === anchorSelectedId);
                    const currIdx = currentColumnItems.findIndex(i => i.id === currentId);

                    if (lastIdx !== -1 && currIdx !== -1) {
                        const start = Math.min(lastIdx, currIdx);
                        const end = Math.max(lastIdx, currIdx);

                        const rangeItems = currentColumnItems.slice(start, end + 1);
                        rangeItems.forEach(i => newSelected.add(i.id));
                    }
                } else {
                    // Fallback: Start new range
                    newSelected.add(currentId);
                    setAnchorSelectedId(currentId);
                }
            } else {
                // Ctrl/Cmd Toggle (No Shift)
                if (newSelected.has(currentId)) {
                    newSelected.delete(currentId);
                } else {
                    newSelected.add(currentId);
                    setAnchorSelectedId(currentId);
                }
            }

            setSelectedIds(newSelected);
            // Do NOT navigate
            return;
        }

        // Standard Single Click (Navigation / Selection)
        setSelectedIds(new Set([item.id]));
        setAnchorSelectedId(item.id);

        // Update path: truncate at depth, append new item
        const newPath = selectedPath.slice(0, depth);
        newPath.push(item.id);
        setSelectedPath(newPath);

        // Sync with currentFolderId
        if (item.type === 'folder') {
            setCurrentFolderId(item.id);
        } else {
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
                    {/* Mobile Back Navigation Header */}
                    <div className="md:hidden flex items-center gap-2">
                        {currentFolderId ? (
                            <button
                                onClick={handleNavigateUp}
                                className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors bg-white/5 px-2 py-1.5 rounded-lg active:scale-95"
                            >
                                <ChevronRight size={16} className="rotate-180" />
                                <span className="font-bold">Back</span>
                            </button>
                        ) : null}
                        <span className="text-white font-bold ml-1 truncate max-w-[150px]">
                            {currentFolder ? currentFolder.name : 'All Files'}
                        </span>
                    </div>

                    {/* Desktop/Tablet Breadcrumbs (Hidden on Mobile) */}
                    <div className="hidden md:flex items-center space-x-2">
                        {viewMode === 'grid' ? (
                            <>
                                <button
                                    onClick={() => handleNavigate(null)}
                                    className={`hover:text-white transition-colors ${!currentFolderId ? 'text-white font-bold' : 'text-neutral-400'}`}
                                >
                                    All Files
                                </button>
                                {getPathToRoot(currentFolderId).map((folderId, index, array) => {
                                    const folder = items.find(i => i.id === folderId);
                                    const isLast = index === array.length - 1;

                                    if (!folder) return null;

                                    return (
                                        <React.Fragment key={folderId}>
                                            <ChevronRight size={14} className="text-neutral-600" />
                                            <button
                                                onClick={() => !isLast && handleNavigate(folderId)}
                                                disabled={isLast}
                                                className={`${isLast ? 'text-white font-bold cursor-default' : 'text-neutral-400 hover:text-white transition-colors'}`}
                                            >
                                                {folder.name}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </>
                        ) : (
                            <span className="text-white font-bold">Column Browser</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleCreateFolder}
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-transparent text-neutral-300 hover:bg-white/5 hover:text-white transition-colors text-xs font-bold"
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
            <div className="flex items-center justify-between mb-6 bg-neutral-900/30 border border-transparent p-1.5 rounded-xl backdrop-blur-sm">
                <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-white pl-9 pr-4 py-2 placeholder-neutral-600"
                    />
                </div>

                <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center bg-neutral-900 rounded-lg border border-transparent p-0.5">
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

                    {/* Desktop Filters - Integrated into Toolbar */}
                    <div className="hidden md:flex items-center gap-1 bg-neutral-900 rounded-lg border border-white/5 p-0.5">
                        {(['all', 'audio', 'image', 'text'] as FilterType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setActiveFilter(type)}
                                className={`
                                    px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all
                                    ${activeFilter === type
                                        ? 'bg-white/10 text-white shadow-sm border border-white/10'
                                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5 border border-transparent'}
                                `}
                            >
                                {type === 'all' ? 'All' : type}
                            </button>
                        ))}
                    </div>

                    <div className="h-4 w-px bg-white/10"></div>

                    <button className="flex items-center space-x-2 px-3 py-1.5 rounded hover:bg-white/5 text-neutral-400 hover:text-white transition-colors text-xs font-mono border border-transparent hover:border-white/5">
                        <ArrowUpDown size={12} />
                        <span className="hidden md:inline">Sort: Date</span>
                        <span className="md:hidden">Date</span>
                    </button>
                </div>
            </div>

            {/* Mobile Filter Bar (Only show if not on desktop, double check done via hidden md:flex above) */}
            <div className="lg:hidden md:hidden relative pb-2 px-2 md:px-0">
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
                className={`w-full bg-[#050505] border rounded-xl relative transition-all flex flex-col ${isDraggingFiles ? 'border-primary border-2 bg-primary/5' : 'border-white/5'} ${viewMode === 'column' ? 'h-[calc(100vh-220px)] min-h-[500px]' : 'min-h-[500px]'}`}
                style={{ overflow: 'hidden' }} // Ensure overflow hidden for column view containment
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
                                    onDoubleClick={() => file.type === 'image' ? openInfo(file) : file.type === 'text' ? openTextEditor(file) : file.type === 'audio' ? handlePlay(file) : null}
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
                    /* Grid View - Terminal Inspired Redesign */
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 content-start">

                        {/* BACK FOLDER (Appears if inside a folder) */}
                        {currentFolderId && (
                            <div
                                onDrop={(e) => {
                                    if (currentFolder && currentFolder.parentId !== undefined) {
                                        handleDrop(e, currentFolder.parentId);
                                    } else {
                                        handleDrop(e, null); // Move to root
                                    }
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    // Optional: visual feedback
                                }}
                                onDoubleClick={handleNavigateUp}
                                className="group flex items-center gap-2.5 p-2.5 rounded-lg border border-white/5 bg-white/5 hover:bg-neutral-800 hover:border-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer font-mono select-none border-dashed"
                            >
                                <CornerUpLeft size={14} className="text-neutral-500 group-hover:text-white" />
                                <span className="text-xs font-bold truncate">..</span>
                            </div>
                        )}

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
                                                group flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer font-mono select-none
                                                ${isSelected
                                            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                            : 'bg-neutral-900/40 border-white/5 hover:bg-neutral-800 hover:border-white/10 text-neutral-400 hover:text-white'
                                        }
                                                ${dragOverFolderId === folder.id ? 'ring-2 ring-primary bg-primary/20 scale-105 z-10' : ''}
                                            `}
                                    data-folder-id={folder.id} // Hook for mobile DnD detection
                                    onTouchStart={(e) => handleTouchStart(e, folder.id)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <Folder size={14} className={isSelected ? 'text-black' : 'text-neutral-500 group-hover:text-white'} fill={isSelected || (dragOverFolderId === folder.id) ? "currentColor" : "none"} />
                                    {renamingId === folder.id ? (
                                        <input
                                            autoFocus
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={handleFinishRename}
                                            onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                                            className="w-full bg-black text-white text-xs border border-white/20 px-1 py-0.5 rounded"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="text-xs font-bold truncate">{folder.name}</span>
                                    )}
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
                                    onDoubleClick={() => file.type === 'audio' ? handlePlay(file) : file.type === 'text' ? openTextEditor(file) : openInfo(file)}
                                    onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
                                    className={`
                                                group flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer font-mono select-none overflow-hidden relative
                                                ${isSelected
                                            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                            : 'bg-[#0A0A0A] border-white/5 hover:bg-neutral-900 hover:border-white/10 text-neutral-400 hover:text-white'
                                        }
                                                ${isPlayingFile ? 'border-primary/50' : ''}
                                                ${touchDragItem?.id === file.id ? 'opacity-50 scale-95' : ''}
                                            `}
                                    onTouchStart={(e) => handleTouchStart(e, file.id)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    {/* Playing Indicator Background */}
                                    {isPlayingFile && !isSelected && (
                                        <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
                                    )}

                                    <div className="flex-shrink-0">
                                        {file.type === 'audio' ? (
                                            isPlayingFile ? <div className="w-3.5 h-3.5 flex items-end gap-0.5"><div className="w-1 bg-primary h-full animate-[music-bar_0.5s_ease-in-out_infinite]" /><div className="w-1 bg-primary h-2/3 animate-[music-bar_0.5s_ease-in-out_infinite_0.1s]" /><div className="w-1 bg-primary h-1/2 animate-[music-bar_0.5s_ease-in-out_infinite_0.2s]" /></div> : <Music size={14} />
                                        ) : file.type === 'image' ? (
                                            file.src ? (
                                                <img src={file.src} className="w-3.5 h-3.5 object-cover rounded-[2px]" alt="" />
                                            ) : <LayoutGrid size={14} />
                                        ) : (
                                            <FileText size={14} />
                                        )}
                                    </div>

                                    {renamingId === file.id ? (
                                        <input
                                            autoFocus
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={handleFinishRename}
                                            onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                                            className="w-full bg-black text-white text-xs border border-white/20 px-1 py-0.5 rounded"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className={`text-xs font-bold truncate ${isPlayingFile && !isSelected ? 'text-primary' : ''}`}>{file.name}</span>
                                            <div className="flex items-center gap-2 text-[9px] opacity-50">
                                                <span>{file.size}</span>
                                                {file.duration && (
                                                    <span>{Math.floor(file.duration / 60)}:{((file.duration % 60).toString().padStart(2, '0'))}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}


                {viewMode === 'column' && (
                    // --- COLUMN VIEW ---
                    <div className="w-full h-full overflow-hidden grid grid-cols-[1fr_20rem] bg-transparent isolate">
                        {/* Scrollable Columns Container */}
                        <div ref={columnContainerRef} className="min-w-0 w-full overflow-x-auto no-scrollbar flex divide-x divide-white/5 h-full">
                            {(() => {
                                const allColumns = getColumns();
                                const MAX_NAV_COLS = 10;
                                const displayCols = allColumns;

                                return displayCols.map((col, i) => {
                                    // Ensure we have a key for every column
                                    const colFolderId = i === 0 ? null : selectedPath[i - 1];
                                    const isColumnDropTarget = dragOverColumnIndex === i;

                                    return (
                                        <div
                                            key={i}
                                            className={`flex-none w-[220px] md:w-[260px] overflow-y-auto custom-scrollbar relative h-full transition-colors duration-200
                                            ${isColumnDropTarget ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'bg-neutral-900/10'}`}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                // Only highlight if we are dragging something different and not into itself (roughly)
                                                // Precise check helps UX but general highlight is fine too
                                                if (draggedItemId) {
                                                    setDragOverColumnIndex(i);
                                                }
                                            }}
                                            onDragLeave={(e) => {
                                                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                                setDragOverColumnIndex(null);
                                            }}
                                            onDrop={(e) => {
                                                setDragOverColumnIndex(null);
                                                handleDrop(e, colFolderId);
                                            }}
                                        >
                                            {col.items.length === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center text-neutral-800 pointer-events-none">
                                                    <span className="text-xs font-mono opacity-20">Empty</span>
                                                </div>
                                            )}
                                            <div className="p-1 space-y-0.5">
                                                {col.items.map(item => {
                                                    const isSelected = selectedIds.has(item.id);
                                                    const isActivePath = selectedPath.includes(item.id);
                                                    const isPlayingFile = currentProject?.id === 'upload_browser_proj' && currentTrackId === item.id && isPlaying;
                                                    const isDropTarget = dragOverFolderId === item.id;
                                                    const isRenaming = renamingId === item.id;

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
                                                            onClick={(e) => handleColumnItemClick(item, i, e)}
                                                            onContextMenu={(e) => handleContextMenu(e, item.type === 'folder' ? 'folder' : 'file', item.id)}
                                                            className={`
                                                            flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer whitespace-nowrap rounded font-mono select-none transition-colors
                                                            ${isSelected
                                                                    ? 'bg-white text-black font-bold'
                                                                    : isActivePath
                                                                        ? 'bg-neutral-800 text-white'
                                                                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                                                }
                                                            ${isPlayingFile && !isSelected ? 'text-primary' : ''}
                                                            ${isDropTarget ? 'bg-primary/20 ring-1 ring-inset ring-primary' : ''}
                                                        `}
                                                        >
                                                            {item.type === 'folder' ? (
                                                                <Folder size={12} className={isSelected ? 'text-black' : 'text-neutral-500'} fill={isSelected || isActivePath ? "currentColor" : "none"} />
                                                            ) : item.type === 'audio' ? (
                                                                <Music size={12} className={isSelected ? 'text-black' : 'text-neutral-500'} />
                                                            ) : item.type === 'image' ? (
                                                                item.src ? (
                                                                    <img src={item.src} className="w-3 h-3 object-cover rounded-[1px]" alt="" />
                                                                ) : <LayoutGrid size={12} className={isSelected ? 'text-black' : 'text-neutral-500'} />
                                                            ) : (
                                                                <FileText size={12} className={isSelected ? 'text-black' : 'text-neutral-500'} />
                                                            )}

                                                            {isRenaming ? (
                                                                <input
                                                                    autoFocus
                                                                    value={renameValue}
                                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                                    onBlur={handleFinishRename}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                                                                    className={`
                                                                    flex-1 bg-transparent border-none outline-none text-xs px-0 py-0
                                                                    ${isSelected ? 'text-black decoration-black' : 'text-white decoration-primary'}
                                                                `}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span className="truncate flex-1">{item.name}</span>
                                                            )}

                                                            {item.type === 'folder' && <ChevronRight size={10} className={isSelected ? 'text-black' : 'text-neutral-600'} />}

                                                            {/* Details show on hover for files? No, too cluttered. */}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            })()}
                        </div>


                        {/* Preview Column (Always Visible - Last in Flex) */}
                        <div className="flex-shrink-0 bg-[#080808] p-8 flex flex-col items-center text-center overflow-y-auto custom-scrollbar border-l border-white/10 h-full relative z-10">
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
                {/* File Operation Notification is now global in App.tsx */}
            </div>

            {/* Touch Drag Overlay */}
            {touchDragItem && (
                <div
                    className="fixed z-[9999] pointer-events-none p-3 bg-[#0A0A0A] border border-primary/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center gap-3 w-48 opacity-90"
                    style={{
                        left: 0,
                        top: 0,
                        transform: `translate(${touchDragItem.x}px, ${touchDragItem.y - 60}px)` // Offset slightly above finger
                    }}
                >
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                        <Folder size={16} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-white truncate max-w-[120px]">
                            {items.find(i => i.id === touchDragItem.id)?.name || 'Moving item...'}
                        </div>
                        <div className="text-[9px] text-primary/80 font-mono font-bold uppercase tracking-wider">
                            Move to folder...
                        </div>
                    </div>
                </div>
            )}

            {/* TEXT EDITOR MODAL */}
            {
                textEditorItem && (
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
                )
            }

            {/* INFO MODAL */}
            {
                infoItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className={`w-full ${infoItem.type === 'image' ? 'max-w-5xl' : 'max-w-md'} bg-[#0a0a0a] border border-neutral-700 rounded-xl shadow-2xl p-6 relative transition-all duration-300`}>
                            <button onClick={() => setInfoItem(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-white z-10 bg-black/50 p-1.5 rounded-full hover:bg-black/80 backdrop-blur-sm transition-colors">
                                <X size={20} />
                            </button>
                            <div className="flex flex-col items-center mb-6">
                                {infoItem.type === 'image' && infoItem.src ? (
                                    <div className="w-full max-h-[70vh] flex items-center justify-center bg-black/20 rounded-xl mb-4 overflow-hidden border border-white/5">
                                        <img
                                            src={infoItem.src}
                                            className="max-w-full max-h-[70vh] object-contain"
                                            alt={infoItem.name}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 bg-neutral-900 rounded-2xl border border-white/10 flex items-center justify-center mb-4 shadow-lg">
                                        {infoItem.type === 'folder' ? (
                                            <Folder size={40} className="text-primary" />
                                        ) : infoItem.type === 'text' ? (
                                            <FileText size={40} className="text-neutral-400" />
                                        ) : (
                                            <Music size={40} className="text-neutral-400" />
                                        )}
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-white mt-2">{infoItem.name}</h3>
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
                )
            }

            {/* CONTEXT MENU */}
            {
                contextMenu && (
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
                                <ContextMenuItem icon={<Trash2 size={14} />} label="Delete" className="text-red-400 hover:bg-red-500/10 hover:text-red-400" onClick={() => handleDelete()} />
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
                                <ContextMenuItem icon={<Trash2 size={14} />} label="Delete" className="text-red-400 hover:bg-red-500/10 hover:text-red-400" onClick={() => handleDelete()} />
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
                )
            }

            {/* Toast Notifications - REMOVED */}
        </div >
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
