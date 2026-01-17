import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { uploadFile, deleteFile, updateAsset } from '../services/supabaseService';
import { OperationItem, FileOperationState, OperationType } from '../components/FileOperationNotification';

interface FileOperationContextType {
    state: FileOperationState;
    uploadFiles: (files: File[]) => Promise<void>;
    deleteFiles: (ids: string[], itemsMap: Map<string, any>) => Promise<void>;
    moveFiles: (ids: string[], targetFolderId: string | null, itemsMap: Map<string, any>) => Promise<void>;
    cancelOperation: () => void;
    toggleMinimize: () => void;
    closeNotification: () => void;
}

const FileOperationContext = createContext<FileOperationContextType | undefined>(undefined);

export const useFileOperation = () => {
    const context = useContext(FileOperationContext);
    if (!context) {
        throw new Error('useFileOperation must be used within a FileOperationProvider');
    }
    return context;
};

export const FileOperationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<FileOperationState>({
        isActive: false,
        type: 'upload',
        items: [],
        total: 0,
        completed: 0,
        errored: 0,
        isMinimized: false
    });

    const toggleMinimize = useCallback(() => {
        setState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
    }, []);

    const closeNotification = useCallback(() => {
        setState(prev => ({ ...prev, isActive: false }));
    }, []);

    const cancelOperation = useCallback(() => {
        // Implement cancellation logic if possible (AbortController?)
        // For now, just close the UI
        setState(prev => ({ ...prev, isActive: false }));
    }, []);

    const uploadFiles = useCallback(async (fileArray: File[], targetFolderId?: string | null) => {
        if (fileArray.length === 0) return;

        // Initialize Operation State
        const newItems: OperationItem[] = fileArray.map((file, idx) => ({
            id: `upload-${Date.now()}-${idx}`,
            name: file.name,
            status: 'pending',
            progress: 0,
            type: file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : 'text'
        }));

        setState({
            isActive: true,
            type: 'upload',
            items: newItems,
            total: fileArray.length,
            completed: 0,
            errored: 0,
            isMinimized: false
        });

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const opItemId = newItems[i].id;

            // Mark processing
            setState(prev => ({
                ...prev,
                items: prev.items.map(item => item.id === opItemId ? { ...item, status: 'processing', progress: 10 } : item)
            }));

            try {
                // Simulate progress
                const interval = setInterval(() => {
                    setState(prev => {
                        const item = prev.items.find(x => x.id === opItemId);
                        if (item && item.status === 'processing' && item.progress < 90) {
                            return {
                                ...prev,
                                items: prev.items.map(x => x.id === opItemId ? { ...x, progress: x.progress + 10 } : x)
                            };
                        }
                        return prev;
                    });
                }, 200);

                const result = await uploadFile(file);

                // If uploading to a specific folder, update the asset immediately
                if (targetFolderId) {
                    await updateAsset(result.assetId, { parentId: targetFolderId });
                }

                clearInterval(interval);

                successCount++;

                // Mark completed
                setState(prev => ({
                    ...prev,
                    completed: successCount,
                    items: prev.items.map(item => item.id === opItemId ? { ...item, status: 'completed', progress: 100 } : item)
                }));

            } catch (error: any) {
                console.error('Upload failed:', error);
                errorCount++;

                let errorMsg = 'Failed';
                if (error.message?.includes('row-level security policy')) {
                    errorMsg = 'Permissions Error';
                } else if (error.message?.includes('Bucket not found')) {
                    errorMsg = 'Bucket Missing';
                }

                setState(prev => ({
                    ...prev,
                    errored: errorCount,
                    items: prev.items.map(item => item.id === opItemId ? { ...item, status: 'error', error: errorMsg, progress: 0 } : item)
                }));
            }
        }

        if (successCount > 0) {
            window.dispatchEvent(new CustomEvent('storage-updated'));
        }

        if (errorCount === 0) {
            setTimeout(() => {
                setState(prev => ({ ...prev, isActive: false }));
            }, 3000);
        }
    }, []);

    const deleteFiles = useCallback(async (idsToDelete: string[], itemsMap: Map<string, any>) => {
        if (idsToDelete.length === 0) return;

        // Build flat list for notification
        // Note: Ideally we recursively find children, but for now we just track the explicit IDs passed.
        // Or if the caller passes the full flattened list logic.
        // Let's rely on the caller or just simplified logic for global context to avoid re-fetching everything here.
        // For simplicity and robustness, we'll map the IDs provided to items.

        const deleteItems: OperationItem[] = idsToDelete.map(id => {
            const item = itemsMap.get(id);
            return {
                id: id,
                name: item?.name || 'Unknown Item',
                status: 'pending',
                progress: 0,
                type: item?.type || 'text'
            };
        });

        setState({
            isActive: true,
            type: 'delete',
            items: deleteItems,
            total: deleteItems.length,
            completed: 0,
            errored: 0,
            isMinimized: false
        });

        let completedCount = 0;
        let erroredCount = 0;

        for (const itemId of idsToDelete) {
            setState(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === itemId ? { ...i, status: 'processing', progress: 50 } : i)
            }));

            try {
                await deleteFile(itemId);
                completedCount++;
                setState(prev => ({
                    ...prev,
                    completed: completedCount,
                    items: prev.items.map(i => i.id === itemId ? { ...i, status: 'completed', progress: 100 } : i)
                }));
            } catch (e) {
                console.error('Failed to delete remote file', itemId, e);
                erroredCount++;
                setState(prev => ({
                    ...prev,
                    errored: erroredCount,
                    items: prev.items.map(i => i.id === itemId ? { ...i, status: 'error', error: 'Failed' } : i)
                }));
            }
        }

        window.dispatchEvent(new CustomEvent('storage-updated'));

        if (erroredCount === 0) {
            setTimeout(() => {
                setState(prev => ({ ...prev, isActive: false }));
            }, 3000);
        }

    }, []);

    const moveFiles = useCallback(async (idsToMove: string[], targetFolderId: string | null, itemsMap: Map<string, any>) => {
        if (idsToMove.length === 0) return;

        const moveItemsList: OperationItem[] = idsToMove.map(id => {
            const item = itemsMap.get(id);
            return {
                id: id,
                name: item?.name || 'Unknown Item',
                status: 'pending',
                progress: 0,
                type: item?.type || 'text'
            };
        });

        setState({
            isActive: true,
            type: 'move',
            items: moveItemsList,
            total: moveItemsList.length,
            completed: 0,
            errored: 0,
            isMinimized: false
        });

        let completedCount = 0;
        let erroredCount = 0;

        for (const id of idsToMove) {
            setState(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === id ? { ...i, status: 'processing', progress: 50 } : i)
            }));

            try {
                await updateAsset(id, { parentId: targetFolderId });
                completedCount++;
                setState(prev => ({
                    ...prev,
                    completed: completedCount,
                    items: prev.items.map(i => i.id === id ? { ...i, status: 'completed', progress: 100 } : i)
                }));
            } catch (e) {
                console.error("Failed to move item", id, e);
                erroredCount++;
                setState(prev => ({
                    ...prev,
                    errored: erroredCount,
                    items: prev.items.map(i => i.id === id ? { ...i, status: 'error', error: 'Move failed' } : i)
                }));
            }
        }

        window.dispatchEvent(new CustomEvent('storage-updated'));

        if (erroredCount === 0) {
            setTimeout(() => {
                setState(prev => ({ ...prev, isActive: false }));
            }, 2000);
        }

    }, []);

    return (
        <FileOperationContext.Provider value={{ state, uploadFiles, deleteFiles, moveFiles, cancelOperation, toggleMinimize, closeNotification }}>
            {children}
        </FileOperationContext.Provider>
    );
};
