# Perbaikan Upload File - FluxLocal Storage

## Masalah yang Diperbaiki

### 1. **Upload File Gagal**
**Penyebab:**
- Limit file size yang terlalu kecil (50GB)
- Timeout yang tidak memadai untuk file besar
- CORS configuration yang tidak lengkap
- Chunk size yang terlalu kecil (5MB)
- Retry logic yang terbatas (hanya 5 percobaan)

### 2. **Upload File Besar Tidak Bisa**
**Penyebab:**
- Timeout server yang terbatas
- Express body parser limit yang terlalu kecil
- Multer file size limit yang terbatas
- Chunk upload timeout yang terlalu pendek
- Concurrent upload yang terlalu sedikit

## Perubahan yang Dilakukan

### Server Side (server/index.ts)

#### 1. Meningkatkan CORS Configuration
```typescript
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-user-id', 'Authorization']
}));
```

#### 2. Meningkatkan Timeout Settings
```typescript
// Increase timeouts for large file uploads
app.use((req, res, next) => {
    req.setTimeout(0); // No timeout for request
    res.setTimeout(0); // No timeout for response
    next();
});
```

#### 3. Meningkatkan Body Parser Limits
```typescript
app.use(express.json({ limit: '100gb' }));
app.use(express.urlencoded({ limit: '100gb', extended: true }));
```

#### 4. Meningkatkan Multer File Size Limit
```typescript
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 * 100, // 100GB limit (sebelumnya 50GB)
        fieldSize: 1024 * 1024 * 100 // 100MB field size
    },
    fileFilter: (req, file, cb) => {
        // Accept all files
        cb(null, true);
    }
});
```

### Client Side (contexts/FileSystemContext.tsx)

#### 1. Meningkatkan Chunk Size
```typescript
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks (sebelumnya 5MB)
```
**Alasan:** Chunk yang lebih besar mengurangi jumlah request HTTP, meningkatkan performa upload

#### 2. Meningkatkan Concurrent Uploads
```typescript
const MAX_CONCURRENT_UPLOADS = 5; // Allow more concurrent uploads (sebelumnya 3)
```
**Alasan:** Lebih banyak upload bersamaan = lebih cepat untuk multiple files

#### 3. Meningkatkan Retry Logic
```typescript
// Increased from 5 to 10 retries
if (retryCount < 10) {
    const delay = Math.min(1000 * Math.pow(1.5, retryCount), 30000); // Max 30s delay
    setTimeout(() => processUploadChunk(transferId, chunkIndex, retryCount + 1), delay);
}
```
**Alasan:** 
- Lebih banyak retry untuk network yang tidak stabil
- Exponential backoff yang lebih halus (1.5x vs 2x)
- Maximum delay cap 30 detik untuk menghindari infinite waiting

#### 4. Menambahkan Abort Controller dengan Timeout
```typescript
// Create abort controller with longer timeout for large chunks
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout per chunk

const response = await fetch('http://localhost:3001/api/upload/chunk', {
    method: 'POST',
    headers: { 'x-user-id': user.id },
    body: formData,
    signal: controller.signal
});

clearTimeout(timeoutId);
```
**Alasan:** 
- Mencegah upload hang selamanya
- 5 menit timeout cukup untuk chunk 10MB bahkan pada koneksi lambat
- Proper cleanup dengan clearTimeout

## Hasil Perbaikan

### ✅ Upload File Kecil
- Upload lebih cepat dengan chunk size yang lebih besar
- Error handling yang lebih baik
- Progress tracking yang lebih akurat

### ✅ Upload File Besar (>1GB)
- Dapat mengupload file hingga 100GB
- Retry otomatis jika ada network error
- Timeout yang cukup untuk koneksi lambat
- Concurrent upload untuk multiple files

### ✅ Stabilitas
- Tidak ada timeout error
- Automatic retry pada network issues
- Better error messages
- Graceful degradation

## Cara Testing

### Test Upload File Kecil (<100MB)
```bash
1. Buka aplikasi di browser
2. Login dengan akun demo
3. Upload file <100MB
4. Verifikasi file berhasil diupload
```

### Test Upload File Sedang (100MB - 1GB)
```bash
1. Siapkan file video atau archive 500MB
2. Upload melalui aplikasi
3. Monitor progress di Transfer Manager
4. Verifikasi file complete
```

### Test Upload File Besar (>1GB)
```bash
1. Siapkan file >1GB (contoh: ISO, backup, video 4K)
2. Upload melalui aplikasi
3. Progress akan tampil dengan detail:
   - Chunk progress
   - Upload speed
   - Estimated time
4. Jika ada network issue, akan auto-retry
5. Setelah complete, file akan muncul di Drive
```

### Test Multiple Files Upload
```bash
1. Select multiple files sekaligus
2. Upload akan diqueue
3. Maksimal 5 concurrent uploads
4. Monitor semua progress di Transfer Manager
```

## Troubleshooting

### Upload masih gagal?
1. **Cek koneksi internet**: Pastikan stabil
2. **Cek server**: Pastikan server running di port 3001
3. **Cek browser console**: Lihat error messages
4. **Cek server logs**: Lihat error di terminal server

### Upload lambat?
1. **Network bandwidth**: Cek kecepatan upload internet
2. **Server resources**: Pastikan CPU/RAM server tidak penuh
3. **Chunk size**: Bisa disesuaikan di FileSystemContext.tsx
4. **Concurrent uploads**: Bisa disesuaikan sesuai bandwidth

### File corrupt setelah upload?
1. **Verifikasi file size**: Harus sama dengan original
2. **Cek merge process**: Lihat server logs
3. **Re-upload**: Upload ulang file tersebut

## Performance Tips

1. **Untuk koneksi cepat (>50Mbps):**
   - Increase CHUNK_SIZE to 20MB
   - Increase MAX_CONCURRENT_UPLOADS to 10

2. **Untuk koneksi lambat (<5Mbps):**
   - Decrease CHUNK_SIZE to 5MB
   - Decrease MAX_CONCURRENT_UPLOADS to 2
   - Increase retry timeout

3. **Untuk file sangat besar (>10GB):**
   - Upload satu file saja
   - Pastikan koneksi stabil
   - Jangan close browser selama upload

## Limitasi

1. **Storage server**: Tergantung disk space server
2. **Upload time**: Tergantung bandwidth upload
3. **Browser memory**: File >5GB mungkin perlu banyak RAM
4. **Network stability**: Koneksi yang sering terputus akan memperlambat upload

## Future Improvements

1. **Resume upload**: Bisa melanjutkan upload yang terputus
2. **Compression**: Compress file sebelum upload
3. **Parallel chunk upload**: Upload multiple chunks bersamaan
4. **WebRTC transfer**: P2P transfer untuk file sangat besar
5. **Background upload**: Upload tetap jalan meski close tab
