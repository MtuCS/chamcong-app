# ChamCong — Ben Xe Manager

**Quan ly cham cong, dieu phoi xe & tinh luong cho doi xe tuyen Dak Lak – Sai Gon.**

Ung dung web single-page xay dung bang React 19 + Vite 6 + Firebase, giup quan ly phan cong tai xe / phu xe theo ngay, tinh cong / luong tu dong, va theo doi ung luong hang thang. Thay the hoan toan ghi chep bang giay.

---

## Muc luc

- [Tong quan nghiep vu](#tong-quan-nghiep-vu)
- [Tinh nang chinh](#tinh-nang-chinh)
- [Kien truc he thong](#kien-truc-he-thong)
- [Mo hinh du lieu](#mo-hinh-du-lieu)
- [Bao mat & Phan quyen](#bao-mat--phan-quyen)
- [Testing & Chat luong](#testing--chat-luong)
- [Bat dau nhanh](#bat-dau-nhanh)
- [Scripts](#scripts)
- [Cau truc thu muc](#cau-truc-thu-muc)
- [Trien khai (Deploy)](#trien-khai-deploy)
- [Roadmap](#roadmap)

---

## Tong quan nghiep vu

He thong phuc vu quan ly van tai tuyen **Dak Lak (DL) -- Sai Gon (SG)**:

| Khai niem | Mo ta |
|---|---|
| **Tuyen** | DL -> SG va SG -> DL (2 huong co dinh) |
| **Ca** | Ca 1 va Ca 2; moi xe co the chay 1 hoac 2 ca/ngay |
| **Chuyen (trip)** | 1 ca = 1 chuyen; 2 chuyen = 1 tour |
| **Don gia** | Tai xe: 500,000 VND/chuyen -- Phu xe: 300,000 VND/chuyen |
| **Trang thai nhat ky** | `DRAFT` (dang nhap lieu) -> `FINAL` (da chot, khoa chinh sua) |
| **Ung luong** | Phieu ung rieng, tu dong tru vao phieu luong cuoi thang |

> Quy tac tinh cong dinh nghia tai [constants.ts](constants.ts), logic tinh luong tai [src/domains/payroll/payroll.utils.ts](src/domains/payroll/payroll.utils.ts).

---

## Tinh nang chinh

### Bang dieu phoi (Dashboard)
- Thong ke tong hop ngay / thang: so chuyen, so tour, tong ung luong.
- Bang phan cong hom nay kem trang thai chot so.
- Xem tai [src/app/Dashboard.tsx](src/app/Dashboard.tsx).

### Nhat ky chay xe (Daily Logs)
- Them / sua / xoa chuyen chay theo ngay va huong.
- Phat hien xung dot real-time: trung slot, trung ca, vuot gioi han 2 ca/nguoi/ngay, xe chua co tai xe.
- Chot so (`FINAL`) khoa toan bo chinh sua; Admin co the mo khoa.
- Logic chinh: [src/domains/dispatch/dispatch.service.ts](src/domains/dispatch/dispatch.service.ts).
- Kiem tra xung dot: [src/domains/dispatch/dispatch.validation.ts](src/domains/dispatch/dispatch.validation.ts).

### Quan ly Nhan su (Employees)
- Them, sua, vo hieu hoa nhan vien; co popup xac nhan truoc khi vo hieu hoa.
- Nhan vien nghi viec: `active = false`, lich su van giu nguyen.
- Quick-add truc tiep tu o nhap lieu ([src/components/EmployeeInput.tsx](src/components/EmployeeInput.tsx)).
- Xem tai [src/app/Employees.tsx](src/app/Employees.tsx).

### Ung luong (Advances)
- Tao phieu ung: ngay, nhan vien, so tien, ghi chu.
- Tong hop ung theo thang, tinh so con lai sau khi tru ung.
- Xem tai [src/app/Advances.tsx](src/app/Advances.tsx) / [src/domains/advances/advances.service.ts](src/domains/advances/advances.service.ts).

### Bao cao & Luong (Reports)
- Phieu luong ca nhan: tong chuyen, tour, tong tien, tru ung, con lai.
- Lich thang voi tom tat tung ngay (co/chua du lieu, da chot hay chua).
- Xem tai [src/app/Reports.tsx](src/app/Reports.tsx) / [src/domains/payroll/payroll.service.ts](src/domains/payroll/payroll.service.ts).

### Cai dat he thong (Settings)
- Chinh don gia, so chuyen/tour, gioi han ca/nguoi.
- Chi Admin moi duoc thay doi.
- Xem tai [src/app/Settings.tsx](src/app/Settings.tsx).

---

## Kien truc he thong

```
+---------------------+     +------------------------+     +--------------------+
|    React 19 SPA     |     |    Domain Services     |     |   Firebase Cloud   |
|   (Vite 6, TS)      +---> |  dispatch / payroll /  +---> |  Firestore + Auth  |
|   src/app/          |     |  advances              |     |  Hosting           |
+---------------------+     +------------------------+     +--------------------+
          |                            |
          v                            v
   src/components/             src/services/
   (Toast, Input)              cache.ts   (TTL 5 min + XSS sanitize)
                               firestore.ts  (CRUD duy nhat)
                               api.ts     (Cloud Function stubs)
```

**Nguyen tac thiet ke:**
- UI chi goi **Domain Services** — khong truy cap Firestore truc tiep.
- Domain Services su dung **Cache Layer** cho employees / vehicles / pay rates (TTL 5 phut, tu dong sanitize XSS).
- Firestore DAL ([src/services/firestore.ts](src/services/firestore.ts)) la diem truy cap duy nhat toi database.
- Pure functions (mapper, validation, payroll utils) de de test va khong co side-effects.
- Hash-based routing qua `HashRouter`: tuong thich voi Firebase Hosting static deploy.

---

## Mo hinh du lieu

### Firestore Collections

| Collection | Muc dich | Truong chinh |
|---|---|---|
| `employees/{uid}` | Danh sach nhan vien | `name`, `role` (DRIVER/ASSISTANT/ADMIN/MANAGER/STAFF), `active` |
| `vehicles/{id}` | Danh sach xe | `code`, `plateNumber`, `active` |
| `worklogs/{dateKey}` | Nhat ky ngay | `dateKey` (YYYY-MM-DD), `status` (DRAFT/FINAL) |
| `worklogs/{dateKey}/runs/{runId}` | Tung chuyen chay | `direction`, `shift`, `vehiclePlate`, `driverId`, `assistantId`, `trips` |
| `advances/{id}` | Phieu ung luong | `employeeId`, `amount`, `date`, `note` |
| `settings/payRates` | Don gia & cau hinh | `driverTrip`, `assistantTrip`, `tourTrips`, `maxShiftsPerDay` |

> Kieu du lieu day du xem tai [src/types/index.ts](src/types/index.ts).

### Quy tac quan trong
- Run chi luu `driverId` / `assistantId` (ID), **khong luu ten truc tiep**.
- Ten nhan vien la derived field dung hien thi — lay tu employee map theo ID.
- Khi nhan vien nghi viec: `active = false`, **khong xoa record** — du lieu lich su van nguyen.

---

## Bao mat & Phan quyen

### Firebase Auth + Firestore Rules

- Dang nhap email/password; ho tro nhap tat (`admin` tu dong thanh `admin@tranghoa.com`).
- User profile luu tai `employees/{uid}` nen phan quyen kiem tra qua Firestore moi request.
- Quy tac chi tiet tai [firestore.rules](firestore.rules):

| Collection | Xem | Ghi / Xoa |
|---|---|---|
| `settings` | Tat ca nguoi dung | ADMIN |
| `employees`, `vehicles` | Tat ca nguoi dung | ADMIN |
| `worklogs`, `runs`, `advances` | Tat ca nguoi dung | Tat ca (planned: MANAGER+) |

### OWASP Security Guards

| Rui ro | Bien phap |
|---|---|
| **A01 Broken Access** | `lockDailyLog()` tu choi chot so neu phat hien nhan vien `active=false` duoc gan vao chuyen |
| **A03 Injection** | `checkDangerousInputConflict()` quet `<script>`, `javascript:`, `onerror=` truoc khi luu |
| **A03 Cache** | Cache strip tag HTML va scheme JS khoi `name` / `plateNumber` khi luu vao bo nho |
| **A04 Insecure Design** | Listener notifications boc trong `try/catch` — 1 listener loi khong anh huong cac listener khac |
| **A05 Stale Data** | Cache TTL 5 phut buoc re-fetch tu Firestore; `forceRefresh=true` de override ngay lap tuc |

---

## Testing & Chat luong

### Chay tests

```bash
npm run test           # watch mode (phat trien)
npm run test:run       # CI mode — chay 1 lan roi thoat
npm run test:coverage  # bao cao coverage HTML + JSON
npm run test:ui        # Vitest UI dashboard
```

### Test suites (63 tests, 4 files)

| File | Noi dung | Tests |
|---|---|---|
| [src/test/dispatch.service.test.ts](src/test/dispatch.service.test.ts) | Validation TC05-TC08: trung slot, trung ca, tieu tai xe, sap xep, helper functions | 27 |
| [src/test/dispatch.security.test.ts](src/test/dispatch.security.test.ts) | Service lock: payload nguy hiem, nhan vien inactive, happy path | 3 |
| [src/test/cache.security.test.ts](src/test/cache.security.test.ts) | Cache TTL, stale data A01, sanitize XSS A03, listener isolation A04 | 6 |
| [src/test/payroll.utils.test.ts](src/test/payroll.utils.test.ts) | Tinh chuyen, tour, format VND, edge cases | 27 |

### Fixtures & Mocking
- Seed data tai [src/test/seed-data.ts](src/test/seed-data.ts): nhan vien, xe, don gia, kich ban TC01-TC10.
- Firestore mock qua `vi.mock('../services/firestore')` — khong can ket noi Firebase that.
- `perfMeasure` mock thanh pass-through de loai bo noise hieu suat.
- Config: [vitest.config.ts](vitest.config.ts) (jsdom, coverage include `src/domains/**`).

---

## Bat dau nhanh

### Yeu cau

| Cong cu | Phien ban |
|---|---|
| Node.js | 20+ |
| npm | 9+ |
| Firebase CLI | `npm install -g firebase-tools` |

### Cai dat & Chay

```bash
# 1. Clone va cai dat dependencies
git clone <repo-url>
cd ChamCong
npm install

# 2. (Tuy chon) Neu can Gemini AI features
echo "GEMINI_API_KEY=your_key_here" > .env.local

# 3. Khoi dong dev server
npm run dev
# -> http://localhost:3000
```

> Firebase credentials san co trong [firebase.ts](firebase.ts), tro ver project `quanlychamcong-65794`.
> **Luu y bao mat:** Truoc khi chuyen sang production moi, chuyen credentials vao bien moi truong.

### Tao tai khoan Admin

1. Tao user trong Firebase Authentication Console.
2. Them document vao Firestore: `employees/{uid}` voi `role: "ADMIN"`, `active: true`, `name: "Ten ban"`.
3. Dang nhap voi email / mat khau vua tao.

---

## Scripts

| Lenh | Mo ta |
|---|---|
| `npm run dev` | Dev server Vite tai http://localhost:3000 (hot reload) |
| `npm run build` | Build production (output: `dist/`) |
| `npm run preview` | Xem preview ban build truoc khi deploy |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest CI mode (chay 1 lan, exit code 0/1) |
| `npm run test:ui` | Vitest UI dashboard |
| `npm run test:coverage` | Coverage report (HTML + JSON + text) |

---

## Cau truc thu muc

```
ChamCong/
|-- App.tsx                          # Root: auth guard, routing (HashRouter)
|-- firebase.ts                      # Khoi tao Firebase (Auth, Firestore, Analytics)
|-- constants.ts                     # Don gia mac dinh, demo data
|-- index.tsx                        # React entry point
|-- vite.config.ts                   # Vite (port 3000, alias @/)
|-- vitest.config.ts                 # Vitest (jsdom, coverage)
|-- firebase.json                    # Firebase Hosting + Firestore emulator
|-- firestore.rules                  # Phan quyen Firestore
|-- firestore.indexes.json           # Composite indexes
|
|-- src/
|   |-- app/                         # Cac man hinh chinh
|   |   |-- Dashboard.tsx            # Tong quan ngay / thang
|   |   |-- DailyLogs.tsx            # Nhat ky va phan cong chuyen chay
|   |   |-- Employees.tsx            # Quan ly nhan su (CRUD + vo hieu hoa)
|   |   |-- Advances.tsx             # Quan ly ung luong
|   |   |-- Reports.tsx              # Phieu luong & lich bao cao thang
|   |   |-- Settings.tsx             # Cau hinh don gia
|   |   |-- Layout.tsx               # Shell, sidebar nav, logout
|   |   |-- Login.tsx                # Dang nhap Firebase Auth
|   |   `-- index.ts
|   |
|   |-- components/
|   |   |-- EmployeeInput.tsx        # Autocomplete + quick-add nhan vien
|   |   |-- Toast.tsx                # He thong thong bao (success/error)
|   |   `-- index.ts
|   |
|   |-- domains/                     # Business logic (khong phu thuoc UI)
|   |   |-- dispatch/
|   |   |   |-- dispatch.service.ts  # Dashboard, load/lock/unlock worklog
|   |   |   |-- dispatch.validation.ts # Kiem tra xung dot + phat hien inject
|   |   |   |-- dispatch.mapper.ts   # Raw data -> View Models
|   |   |   `-- dispatch.types.ts    # Types dac thu dispatch
|   |   |-- payroll/
|   |   |   |-- payroll.service.ts   # Tong hop phieu luong theo thang
|   |   |   `-- payroll.utils.ts     # Tinh chuyen/tour/tien, format VND
|   |   `-- advances/
|   |       `-- advances.service.ts  # Phieu ung: list, create, delete, stats
|   |
|   |-- services/
|   |   |-- firestore.ts             # Toan bo Firestore CRUD (DAL duy nhat)
|   |   |-- cache.ts                 # Bo dem TTL 5 phut, sanitize XSS
|   |   `-- api.ts                   # Stub Cloud Functions (tuong lai)
|   |
|   |-- types/
|   |   `-- index.ts                 # Entity, enum, View Models
|   |
|   |-- utils/
|   |   `-- perf.ts                  # perfMeasure / perfStart / withPerfLogging
|   |
|   `-- test/
|       |-- seed-data.ts             # Fixtures TC01-TC10
|       |-- setup.ts                 # @testing-library/jest-dom
|       |-- dispatch.service.test.ts
|       |-- dispatch.security.test.ts
|       |-- cache.security.test.ts
|       `-- payroll.utils.test.ts
|
|-- dataconnect/                     # Google Data Connect (GraphQL, tuong lai)
|   |-- schema/schema.gql
|   |-- seed_data.gql
|   `-- example/
|
|-- functions/                       # Firebase Cloud Functions (Node 24, stub)
|   `-- src/index.ts
|
`-- public/
    `-- img/
```

---

## Trien khai (Deploy)

```bash
# Build + deploy Frontend
npm run build
firebase deploy --only hosting

# Deploy Firestore rules & indexes
firebase deploy --only firestore

# Deploy tat ca
firebase deploy
```

> Huong dan chi tiet trong [deploy_hosting.md](deploy_hosting.md).
> Firebase project: `quanlychamcong-65794` (xem [.firebaserc](.firebaserc)).

---

## Roadmap

- [ ] **Firestore rules chat che hon** — gioi han ghi `worklogs` / `runs` chi cho MANAGER+.
- [ ] **Cloud Functions** — hoan thien stubs trong [src/services/api.ts](src/services/api.ts): lock/unlock, tinh luong, xuat Excel/PDF.
- [ ] **Xuat bao cao** — phieu luong hang thang dang Excel / PDF cho ke toan.
- [ ] **PWA + Offline** — Service Worker + IndexedDB sync cho vung 3G yeu.
- [ ] **CI/CD** — GitHub Actions: `npm run test:run` + `firebase deploy` tu dong khi push main.
- [ ] **Mo rong tuyen** — kien truc san sang them tuyen moi ngoai DL -- SG.
- [ ] **Phan quyen chi tiet** — tach vai tro Dieu hanh (nhap lieu) va Quan ly (chot so / bao cao).
