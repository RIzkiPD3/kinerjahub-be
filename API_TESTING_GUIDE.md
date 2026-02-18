# 🚀 KinerjaHub API Testing Guide

## ❓ Kenapa "Cannot GET /api/auth/register"?

### Penjelasan Singkat:
- ✅ **Ini adalah behavior NORMAL**, bukan error!
- Browser secara default melakukan **GET request** ketika URL diakses langsung
- Endpoint `/api/auth/register` dan `/api/auth/login` **hanya menerima POST request**
- Karena tidak ada handler untuk GET, Express mengembalikan `Cannot GET /api/auth/register`

### Analogi:
Seperti mengetuk pintu yang bertulisan "Hanya untuk tamu undangan" dengan cara biasa - pintunya tidak akan terbuka karena Anda harus pakai kartu khusus (POST request).

---

## ✅ Konfigurasi Express Anda Sudah Benar

### Routes (src/routes/auth.routes.ts)
```typescript
authRouter.post("/register", register);  // ✅ POST method
authRouter.post("/login", login);        // ✅ POST method
```

### Middleware (src/app.ts)
```typescript
app.use(cors());              // ✅ CORS enabled
app.use(express.json());      // ✅ JSON parser enabled
app.use("/api/auth", authRouter);  // ✅ Routes mounted correctly
```

---

## 🧪 Cara Testing yang Benar

### 1. Health Check (GET - bisa diakses browser)
```bash
# cURL
curl https://your-app.railway.app/health

# atau buka langsung di browser
https://your-app.railway.app/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-02-18T02:08:40.000Z",
  "uptime": 1234.56,
  "environment": "production"
}
```

---

### 2. Register (POST - TIDAK bisa di browser)

#### Menggunakan cURL:
```bash
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "password123",
    "organization_name": "Example Corp",
    "organization_address": "123 Main St, Jakarta",
    "organization_phone": "+62 812-3456-7890"
  }'
```

#### Menggunakan JavaScript (fetch):
```javascript
const response = await fetch('https://your-app.railway.app/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    name: 'John Doe',
    password: 'password123',
    organization_name: 'Example Corp',
    organization_address: '123 Main St, Jakarta',
    organization_phone: '+62 812-3456-7890',
  }),
});

const data = await response.json();
console.log(data);
```

#### Menggunakan axios:
```javascript
const { data } = await axios.post('https://your-app.railway.app/api/auth/register', {
  email: 'user@example.com',
  name: 'John Doe',
  password: 'password123',
  organization_name: 'Example Corp',
  organization_address: '123 Main St, Jakarta',
  organization_phone: '+62 812-3456-7890',
});

console.log(data);
```

---

### 3. Login (POST - TIDAK bisa di browser)

#### Menggunakan cURL:
```bash
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Menggunakan JavaScript (fetch):
```javascript
const response = await fetch('https://your-app.railway.app/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const data = await response.json();
console.log(data);
// Simpan token jika ada
if (data.token) {
  localStorage.setItem('token', data.token);
}
```

---

## 🎨 Frontend Testing Tool

Saya sudah membuat **test-frontend-example.html** yang bisa Anda gunakan:

1. Buka file `test-frontend-example.html` di browser
2. Ganti URL di bagian atas dengan URL Railway Anda
3. Test semua endpoint dengan tombol yang tersedia
4. Lihat response langsung di halaman

---

## 🔍 Tools untuk Testing API

### 1. **Browser (hanya untuk GET requests)**
- ✅ `/health` - bisa diakses
- ❌ `/api/auth/register` - TIDAK bisa (POST only)
- ❌ `/api/auth/login` - TIDAK bisa (POST only)

### 2. **Swagger UI** (sudah ada di project Anda)
- Akses: `https://your-app.railway.app/api-docs`
- ✅ Bisa test semua endpoint
- ✅ Auto-generate request body
- ✅ Lihat response langsung

### 3. **Postman / Insomnia / Thunder Client**
- ✅ GUI yang mudah digunakan
- ✅ Bisa simpan request
- ✅ Environment variables support

### 4. **cURL (Command Line)**
- ✅ Cepat untuk testing
- ✅ Bisa dimasukkan dalam script
- ✅ Universal (ada di semua OS)

### 5. **Frontend Code (HTML/JS/React/etc)**
- ✅ Testing real-world scenario
- ✅ Lihat behavior seperti user
- ✅ Test CORS

---

## 🎯 Checklist Testing

Sebelum deploy ke production:

- [ ] ✅ Health check endpoint berjalan (`GET /health`)
- [ ] ✅ Register endpoint berjalan (`POST /api/auth/register`)
- [ ] ✅ Login endpoint berjalan (`POST /api/auth/login`)
- [ ] ✅ CORS berfungsi (test dari frontend)
- [ ] ✅ Error handling berfungsi (test dengan data invalid)
- [ ] ✅ Database connection aktif
- [ ] ✅ Environment variables terload dengan benar

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot GET /api/auth/register"
**Solusi:** Ini BUKAN error! Gunakan POST request, bukan GET.

### Issue 2: CORS Error
**Solusi:** Pastikan `app.use(cors())` ada sebelum routes di `app.ts` (sudah benar di project Anda).

### Issue 3: Request Timeout
**Solusi:** 
- Check database connection
- Check Railway logs
- Verifikasi environment variables

### Issue 4: 404 Not Found
**Solusi:**
- Pastikan URL benar
- Check Railway deploy logs
- Pastikan routes di-mount dengan benar

---

## 📝 Quick Reference

| Endpoint | Method | Browser? | Purpose |
|----------|--------|----------|---------|
| `/` | GET | ✅ Yes | Root endpoint |
| `/health` | GET | ✅ Yes | Health check |
| `/api-docs` | GET | ✅ Yes | Swagger UI |
| `/api/auth/register` | POST | ❌ No | User registration |
| `/api/auth/login` | POST | ❌ No | User login |

---

## 🚀 Next Steps

1. Test health endpoint di browser: `https://your-app.railway.app/health`
2. Test auth endpoints di Swagger: `https://your-app.railway.app/api-docs`
3. Integrate dengan frontend menggunakan contoh code di atas
4. Monitor Railway logs untuk debugging

**Good luck! 🎉**
