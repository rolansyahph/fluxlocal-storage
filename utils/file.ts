
// Helper to recursively scan DataTransferItem
// Returns a flat list of files with their relative paths
export interface FileEntry {
    file: File;
    path: string; // "Folder/Sub/File.txt"
}

export const scanDroppedItems = async (items: DataTransferItemList): Promise<FileEntry[]> => {
    const entries: FileEntry[] = [];

    // Helper to process a single FileSystemEntry
    const traverse = async (entry: any, path: string = '') => {
        if (entry.isFile) {
            const file = await new Promise<File>((resolve, reject) => {
                entry.file(resolve, reject);
            });
            // If path is empty, it's a root file, just use filename
            // If path exists, append filename
            // Note: entry.fullPath usually starts with /
            entries.push({
                file,
                path: path + entry.name
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();

            // readEntries needs to be called until it returns empty array
            const readBatch = async () => {
                const results = await new Promise<any[]>((resolve, reject) => {
                    dirReader.readEntries(resolve, reject);
                });

                if (results.length > 0) {
                    for (const child of results) {
                        await traverse(child, path + entry.name + '/');
                    }
                    await readBatch();
                }
            };

            await readBatch();
        }
    };

    const promises = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
            if (entry) {
                promises.push(traverse(entry));
            } else {
                // Fallback for non-webkit (rare nowadays for drag and drop)
                const file = item.getAsFile();
                if (file) {
                    entries.push({ file, path: file.name });
                }
            }
        }
    }

    await Promise.all(promises);
    return entries;
};
