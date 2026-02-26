# Ứng dụng chấm công - điều phối chuyến

**Quản lý chấm công, điều phối xe & tính lương cho nhà xe Trang Hòa.**

Ứng dụng web single-page xây dựng bằng React 19 + Vite 6 + Firebase, giúp quản lý phân công tài xế / phụ xe theo ngày, tính công / lương tự động, và theo dõi ứng lương hằng tháng. Thay thế hoàn toàn việc ghi chép bằng giấy.

---

## Mục lục

- [Tổng quan nghiệp vụ](#tong-quan-nghiep-vu)
- [Tính năng chính](#tinh-nang-chinh)
- [Kiến trúc hệ thống](#kien-truc-he-thong)
- [Mô hình dữ liệu](#mo-hinh-du-lieu)
- [Bảo mật & Phân quyền](#bao-mat--phan-quyen)
- [Testing & Chất lượng](#testing--chat-luong)
- [Bắt đầu nhanh](#bat-dau-nhanh)
- [Scripts](#scripts)
- [Cấu trúc thư mục](#cau-truc-thu-muc)
- [Triển khai (Deploy)](#trien-khai-deploy)
- [Roadmap](#roadmap)

---

## Tổng quan nghiệp vụ

Hệ thống phục vụ quản lý vận tải tuyến **Đắk Lắk (DL) ↔ Sài Gòn (SG)**:

| Khái niệm | Mô tả |
|-----------|-------|
| **Tuyến** | DL → SG và SG → DL (2 hướng cố định) |
| **Ca** | Ca 1 và Ca 2; mỗi xe có thể chạy 1 hoặc 2 ca/ngày |
| **Chuyến (trip)** | 1 ca = 1 chuyến; 2 chuyến = 1 tour |
| **Đơn giá** | Tài xế: 500.000 VND/chuyến – Phụ xe: 300.000 VND/chuyến |
| **Trạng thái nhật ký** | `DRAFT` (đang nhập liệu) → `FINAL` (đã chốt, khóa chỉnh sửa) |
| **Ứng lương** | Phiếu ứng riêng, tự động trừ vào phiếu lương cuối tháng |


> Quy tắc tính công được định nghĩa tại [constants.ts](constants.ts), logic tính lương tại [src/domains/payroll/payroll.utils.ts](src/domains/payroll/payroll.utils.ts).

---

## Tính năng chính

### Bảng điều phối (Dashboard)
- Thống kê tổng hợp ngày / tháng: số chuyến, số tour, tổng ứng lương.
- Bảng phân công hôm nay kèm trạng thái chốt sổ.
- Xem tại [src/app/Dashboard.tsx](src/app/Dashboard.tsx).

### Nhật ký chạy xe (Daily Logs)
- Thêm / sửa / xóa chuyến chạy theo ngày và hướng.
- Phát hiện xung đột real-time: trùng slot, trùng ca, vượt giới hạn 2 ca/người/ngày, xe chưa có tài xế.
- Chốt sổ (`FINAL`) khóa toàn bộ chỉnh sửa; Admin có thể mở khóa.
- Logic chính: [src/domains/dispatch/dispatch.service.ts](src/domains/dispatch/dispatch.service.ts).
- Kiểm tra xung đột: [src/domains/dispatch/dispatch.validation.ts](src/domains/dispatch/dispatch.validation.ts).

### Quản lý nhân sự (Employees)
- Thêm, sửa, vô hiệu hóa nhân viên; có popup xác nhận trước khi vô hiệu hóa.
- Nhân viên nghỉ việc: `active = false`, lịch sử vẫn giữ nguyên.
- Quick-add trực tiếp từ ô nhập liệu ([src/components/EmployeeInput.tsx](src/components/EmployeeInput.tsx)).
- Xem tại [src/app/Employees.tsx](src/app/Employees.tsx).

### Ứng lương (Advances)
- Tạo phiếu ứng: ngày, nhân viên, số tiền, ghi chú.
- Tổng hợp ứng theo tháng, tính số còn lại sau khi trừ ứng.
- Xem tại [src/app/Advances.tsx](src/app/Advances.tsx) / [src/domains/advances/advances.service.ts](src/domains/advances/advances.service.ts).

### Báo cáo & Lương (Reports)
- Phiếu lương cá nhân: tổng chuyến, tour, tổng tiền, trừ ứng, còn lại.
- Lịch tháng với tóm tắt từng ngày (có/chưa có dữ liệu, đã chốt hay chưa).
- Xem tại [src/app/Reports.tsx](src/app/Reports.tsx) / [src/domains/payroll/payroll.service.ts](src/domains/payroll/payroll.service.ts).

### Cài đặt hệ thống (Settings)
- Chỉnh đơn giá, số chuyến/tour, giới hạn ca/người.
- Chỉ Admin mới được thay đổi.
- Xem tại [src/app/Settings.tsx](src/app/Settings.tsx).

---

## Kiến trúc hệ thống

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

**Nguyên tắc thiết kế:**
- UI chỉ gọi **Domain Services** — không truy cập Firestore trực tiếp.
- Domain Services sử dụng **Cache Layer** cho employees / vehicles / pay rates (TTL 5 phút, tự động sanitize XSS).
- Firestore DAL ([src/services/firestore.ts](src/services/firestore.ts)) là điểm truy cập duy nhất tới database.
- Pure functions (mapper, validation, payroll utils) để dễ test và không có side-effects.
- Hash-based routing qua `HashRouter`: tương thích với Firebase Hosting static deploy.

---

## Mô hình dữ liệu

### Firestore Collections

| Collection | Mục đích | Trường chính |
|---|---|---|
| `employees/{uid}` | Danh sách nhân viên | `name`, `role` (DRIVER/ASSISTANT/ADMIN/MANAGER/STAFF), `active` |
| `vehicles/{id}` | Danh sách xe | `code`, `plateNumber`, `active` |
| `worklogs/{dateKey}` | Nhật ký ngày | `dateKey` (YYYY-MM-DD), `status` (DRAFT/FINAL) |
| `worklogs/{dateKey}/runs/{runId}` | Từng chuyến chạy | `direction`, `shift`, `vehiclePlate`, `driverId`, `assistantId`, `trips` |
| `advances/{id}` | Phiếu ứng lương | `employeeId`, `amount`, `date`, `note` |
| `settings/payRates` | Đơn giá & cấu hình | `driverTrip`, `assistantTrip`, `tourTrips`, `maxShiftsPerDay` |

> Kiểu dữ liệu đầy đủ xem tại [src/types/index.ts](src/types/index.ts).

### Quy tắc quan trọng
- Run chỉ lưu `driverId` / `assistantId` (ID), **không lưu tên trực tiếp**.
- Tên nhân viên là derived field dùng hiển thị — lấy từ employee map theo ID.
- Khi nhân viên nghỉ việc: `active = false`, **không xóa record** — dữ liệu lịch sử vẫn nguyên vẹn.

---

## Bảo mật & Phân quyền

### Firebase Auth + Firestore Rules

- Đăng nhập email/password; hỗ trợ nhập tắt (`admin` tự động thành `admin@tranghoa.com`).
- User profile lưu tại `employees/{uid}` nên phân quyền kiểm tra qua Firestore mỗi request.
- Quy tắc chi tiết tại [firestore.rules](firestore.rules):

| Collection | Xem | Ghi / Xóa |
|---|---|---|
| `settings` | Tất cả người dùng | ADMIN |
| `employees`, `vehicles` | Tất cả người dùng | ADMIN |
| `worklogs`, `runs`, `advances` | Tất cả người dùng | Tất cả (planned: MANAGER+) |

### OWASP Security Guards

| Rủi ro | Biện pháp |
|---|---|
| **A01 Broken Access** | `lockDailyLog()` từ chối chốt sổ nếu phát hiện nhân viên `active=false` được gán vào chuyến |
| **A03 Injection** | `checkDangerousInputConflict()` quét `<script>`, `javascript:`, `onerror=` trước khi lưu |
| **A03 Cache** | Cache strip tag HTML và scheme JS khỏi `name` / `plateNumber` khi lưu vào bộ nhớ |
| **A04 Insecure Design** | Listener notifications bọc trong `try/catch` — 1 listener lỗi không ảnh hưởng các listener khác |
| **A05 Stale Data** | Cache TTL 5 phút buộc re-fetch từ Firestore; `forceRefresh=true` để override ngay lập tức |

---

## Testing & Chất lượng

### Chạy tests

```bash
npm run test           # watch mode (phát triển)
npm run test:run       # CI mode — chạy 1 lần rồi thoát
npm run test:coverage  # báo cáo coverage HTML + JSON
npm run test:ui        # Vitest UI dashboard
```

### Test suites (63 tests, 4 files)

| File | Nội dung | Tests |
|---|---|---|
| [src/test/dispatch.service.test.ts](src/test/dispatch.service.test.ts) | Validation TC05-TC08: trùng slot, trùng ca, tiêu tài xế, sắp xếp, helper functions | 27 |
| [src/test/dispatch.security.test.ts](src/test/dispatch.security.test.ts) | Service lock: payload nguy hiểm, nhân viên inactive, happy path | 3 |
| [src/test/cache.security.test.ts](src/test/cache.security.test.ts) | Cache TTL, stale data A01, sanitize XSS A03, listener isolation A04 | 6 |
| [src/test/payroll.utils.test.ts](src/test/payroll.utils.test.ts) | Tính chuyến, tour, format VND, edge cases | 27 |

### Fixtures & Mocking
- Seed data tại [src/test/seed-data.ts](src/test/seed-data.ts): nhân viên, xe, đơn giá, kịch bản TC01-TC10.
- Firestore mock qua `vi.mock('../services/firestore')` — không cần kết nối Firebase thật.
- `perfMeasure` mock thành pass-through để loại bỏ noise hiệu suất.
- Config: [vitest.config.ts](vitest.config.ts) (jsdom, coverage include `src/domains/**`).

---

## Bắt đầu nhanh

### Yêu cầu

| Công cụ | Phiên bản |
|---|---|
| Node.js | 20+ |
| npm | 9+ |
| Firebase CLI | `npm install -g firebase-tools` |

### Cài đặt & Chạy

```bash
# 1. Clone và cài đặt dependencies
git clone <repo-url>
cd ChamCong
npm install

# 2. (Tùy chọn) Nếu cần Gemini AI features
echo "GEMINI_API_KEY=your_key_here" > .env.local

# 3. Khởi động dev server
npm run dev
# -> http://localhost:3000
```

> Firebase credentials được cấu hình qua biến môi trường, trỏ về project `quanlychamcong-65794`.
> **Lưu ý bảo mật:** Trước khi chuyển sang production mới, đưa credentials vào secret manager / env an toàn.

### Tạo tài khoản Admin

1. Tạo user trong Firebase Authentication Console.
2. Thêm document vào Firestore: `employees/{uid}` với `role: "ADMIN"`, `active: true`, `name: "Tên bạn"`.
3. Đăng nhập với email / mật khẩu vừa tạo.

---

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server Vite tại http://localhost:3000 (hot reload) |
| `npm run build` | Build production (output: `dist/`) |
| `npm run preview` | Xem preview bản build trước khi deploy |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest CI mode (chạy 1 lần, exit code 0/1) |
| `npm run test:ui` | Vitest UI dashboard |
| `npm run test:coverage` | Coverage report (HTML + JSON + text) |

---

## Cấu trúc thư mục

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

## Cấu trúc thư mục

```
ChamCong/
|-- App.tsx                          # Root: auth guard, routing (HashRouter)
|-- firebase.ts                      # Khởi tạo Firebase (Auth, Firestore, Analytics)
|-- constants.ts                     # Đơn giá mặc định, demo data
|-- index.tsx                        # React entry point
|-- vite.config.ts                   # Vite (port 3000, alias @/)
|-- vitest.config.ts                 # Vitest (jsdom, coverage)
|-- firebase.json                    # Firebase Hosting + Firestore emulator
|-- firestore.rules                  # Phân quyền Firestore
|-- firestore.indexes.json           # Composite indexes
|
|-- src/
|   |-- app/                         # Các màn hình chính
|   |   |-- Dashboard.tsx            # Tổng quan ngày / tháng
|   |   |-- DailyLogs.tsx            # Nhật ký và phân công chuyến chạy
|   |   |-- Employees.tsx            # Quản lý nhân sự (CRUD + vô hiệu hóa)
|   |   |-- Advances.tsx             # Quản lý ứng lương
|   |   |-- Reports.tsx              # Phiếu lương & lịch báo cáo tháng
|   |   |-- Settings.tsx             # Cấu hình đơn giá
|   |   |-- Layout.tsx               # Shell, sidebar nav, logout
|   |   |-- Login.tsx                # Đăng nhập Firebase Auth
|   |   `-- index.ts
|   |
|   |-- components/
|   |   |-- EmployeeInput.tsx        # Autocomplete + quick-add nhân viên
|   |   |-- Toast.tsx                # Hệ thống thông báo (success/error)
|   |   `-- index.ts
|   |
|   |-- domains/                     # Business logic (không phụ thuộc UI)
|   |   |-- dispatch/
|   |   |   |-- dispatch.service.ts  # Dashboard, load/lock/unlock worklog
|   |   |   |-- dispatch.validation.ts # Kiểm tra xung đột + phát hiện inject
|   |   |   |-- dispatch.mapper.ts   # Raw data -> View Models
|   |   |   `-- dispatch.types.ts    # Types đặc thù dispatch
|   |   |-- payroll/
|   |   |   |-- payroll.service.ts   # Tổng hợp phiếu lương theo tháng
|   |   |   `-- payroll.utils.ts     # Tính chuyến/tour/tiền, format VND
|   |   `-- advances/
|   |       `-- advances.service.ts  # Phiếu ứng: list, create, delete, stats
|   |
|   |-- services/
|   |   |-- firestore.ts             # Toàn bộ Firestore CRUD (DAL duy nhất)
|   |   |-- cache.ts                 # Bộ đệm TTL 5 phút, sanitize XSS
|   |   `-- api.ts                   # Stub Cloud Functions (tương lai)
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
|-- dataconnect/                     # Google Data Connect (GraphQL, tương lai)
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

## Triển khai (Deploy)

```bash
# Build + deploy Frontend
npm run build
firebase deploy --only hosting

# Deploy Firestore rules & indexes
firebase deploy --only firestore

# Deploy tất cả
firebase deploy
```

> Hướng dẫn chi tiết trong [deploy_hosting.md](deploy_hosting.md).
> Firebase project: `quanlychamcong-65794` (xem [.firebaserc](.firebaserc)).

---

## Roadmap

- [ ] **Firestore rules chặt chẽ hơn** — giới hạn ghi `worklogs` / `runs` chỉ cho MANAGER+.
- [ ] **Cloud Functions** — hoàn thiện stubs trong [src/services/api.ts](src/services/api.ts): lock/unlock, tính lương, xuất Excel/PDF.
- [ ] **Xuất báo cáo** — phiếu lương hàng tháng dạng Excel / PDF cho kế toán.
- [ ] **PWA + Offline** — Service Worker + IndexedDB sync cho vùng sóng yếu.
- [ ] **CI/CD** — GitHub Actions: `npm run test:run` + `firebase deploy` tự động khi push main.
- [ ] **Mở rộng tuyến** — kiến trúc sẵn sàng thêm tuyến mới ngoài DL -- SG.
- [ ] **Phân quyền chi tiết** — tách vai trò Điều hành (nhập liệu) và Quản lý (chốt sổ / báo cáo).
